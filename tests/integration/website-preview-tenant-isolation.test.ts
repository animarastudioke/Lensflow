import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 11 Step 11 / Step 12: the new authenticated preview route
 * (`/dashboard/[studioSlug]/website/[websiteId]/preview`) and the page
 * content editor route both resolve their data through getWebsite() /
 * getWebsitePage(), which query `websites`/`website_pages` with the
 * caller's own RLS-scoped session -- no separate authorization check was
 * added on top, on the reasoning that RLS already protects it (Step 5: "do
 * not add redundant authorization architecture if existing RLS already
 * correctly protects the operation"). This test proves that reasoning
 * against the real database with real JWT-backed users, rather than taking
 * it on faith: a studio owner can read their own website's row and pages
 * (draft or published -- the point of preview), and a *different* studio's
 * owner reading the exact same website/page ids gets nothing back.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error('website-preview-tenant-isolation.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).')
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-wpreview-${RUN_ID}`

interface RoleUser {
  userId: string
  client: SupabaseClient
}

let studioAId: string
let studioBId: string
let clientUserIds: string[] = []
let ownerA: RoleUser
let ownerB: RoleUser
let websiteAId: string
let pageAId: string

async function createRoleUser(label: string, role: string, targetStudioId: string): Promise<RoleUser> {
  const email = `${RUN_TAG}-${label}@example.com`
  const password = crypto.randomUUID()
  const { data: userRes, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (userError || !userRes.user) throw new Error(`Failed to create ${label}: ${userError?.message}`)

  const { error: memberError } = await admin.from('studio_members').insert({
    studio_id: targetStudioId, user_id: userRes.user.id, role, status: 'active', joined_at: new Date().toISOString(),
  })
  if (memberError) throw new Error(`Failed to add ${label} to studio: ${memberError.message}`)

  const anonForSignIn = createClient(SUPABASE_URL, ANON_KEY)
  const { data: signIn, error: signInError } = await anonForSignIn.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.session) throw new Error(`Failed to sign in ${label}: ${signInError?.message}`)

  const scopedClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  clientUserIds.push(userRes.user.id)
  return { userId: userRes.user.id, client: scopedClient }
}

beforeAll(async () => {
  const { data: studioA } = await admin.from('studios').insert({ name: `${RUN_TAG}-a`, slug: `${RUN_TAG}-a`, owner_id: null }).select('id').single()
  studioAId = studioA!.id
  const { data: studioB } = await admin.from('studios').insert({ name: `${RUN_TAG}-b`, slug: `${RUN_TAG}-b`, owner_id: null }).select('id').single()
  studioBId = studioB!.id

  ownerA = await createRoleUser('owner-a', 'studio_owner', studioAId)
  await admin.from('studios').update({ owner_id: ownerA.userId }).eq('id', studioAId)
  ownerB = await createRoleUser('owner-b', 'studio_owner', studioBId)
  await admin.from('studios').update({ owner_id: ownerB.userId }).eq('id', studioBId)

  const { data: websiteA } = await admin
    .from('websites')
    .insert({ studio_id: studioAId, name: 'Website A', subdomain: `${RUN_TAG}-site-a`, status: 'draft' })
    .select('id')
    .single()
  websiteAId = websiteA!.id

  const { data: pageA } = await admin
    .from('website_pages')
    .insert({ website_id: websiteAId, name: 'Home', path: '/', is_published: false, content: { heading: 'Draft heading' } })
    .select('id')
    .single()
  pageAId = pageA!.id
})

afterAll(async () => {
  if (studioAId) await admin.from('studios').delete().eq('id', studioAId)
  if (studioBId) await admin.from('studios').delete().eq('id', studioBId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

describe('Website preview / editor data access: same-studio owner (what getWebsite()/getWebsitePage() rely on)', () => {
  it('owner A can read website A, including its unpublished draft content -- this is what preview needs to show', async () => {
    const { data } = await ownerA.client.from('websites').select('id, status').eq('id', websiteAId).single()
    expect(data?.id).toBe(websiteAId)
    expect(data?.status).toBe('draft')
  })

  it('owner A can read page A\'s saved content even though it is unpublished', async () => {
    const { data } = await ownerA.client.from('website_pages').select('id, content').eq('id', pageAId).single()
    expect(data?.id).toBe(pageAId)
    expect((data?.content as { heading?: string })?.heading).toBe('Draft heading')
  })
})

describe('Website preview / editor data access: cross-studio isolation (User B against Website A)', () => {
  it('owner B cannot read website A by id -- the same query the preview/editor pages run returns nothing', async () => {
    const { data } = await ownerB.client.from('websites').select('id').eq('id', websiteAId)
    expect(data ?? []).toEqual([])
  })

  it('owner B cannot read page A\'s content by id', async () => {
    const { data } = await ownerB.client.from('website_pages').select('id, content').eq('id', pageAId)
    expect(data ?? []).toEqual([])
  })

  it('owner B cannot update page A\'s content (what updateWebsitePageContent ultimately relies on)', async () => {
    const { data, error } = await ownerB.client
      .from('website_pages')
      .update({ content: { heading: 'Hijacked' } })
      .eq('id', pageAId)
      .select('id')
    expect(data ?? []).toEqual([])
    expect(error).toBeNull() // RLS silently matches zero rows rather than erroring, matching this app's established pattern
    const { data: unchanged } = await admin.from('website_pages').select('content').eq('id', pageAId).single()
    expect((unchanged?.content as { heading?: string })?.heading).toBe('Draft heading')
  })

  it('owner B cannot delete website A', async () => {
    const { error } = await ownerB.client.from('websites').delete().eq('id', websiteAId)
    const { data: stillThere } = await admin.from('websites').select('id').eq('id', websiteAId).maybeSingle()
    expect(stillThere?.id).toBe(websiteAId)
    expect(error).toBeNull()
  })
})

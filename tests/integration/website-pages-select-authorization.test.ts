import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 5 P3 acceptance test for migration 040
 * (040_website_pages_select_role_enforcement.sql).
 *
 * CORRECTION to the post-Phase-4 hygiene report: that report predicted
 * editor could read raw website_pages via direct PostgREST, reasoning
 * from the policy text alone. Live-testing this file (against the
 * CURRENT, undeployed-040 database) disproves that: editor is already
 * denied today. Root cause -- website_pages' combined ALL policy's
 * EXISTS subquery joins to `websites`, and that join is itself subject
 * to the `websites` table's own SELECT RLS policy for the querying
 * role (Postgres does not exempt a policy's internal subqueries from
 * other tables' RLS). Migration 037 already tightened `websites`'
 * SELECT policy to require website:read, which editor lacks -- so the
 * EXISTS subquery already silently fails for editor as a side effect,
 * even though website_pages' own policy text only ever checked
 * is_studio_member. This is real protection, but ACCIDENTAL and
 * fragile: it depends on a different table's policy shape and breaks
 * if `websites`' policy is ever loosened, or if any future code path
 * queries website_pages without going through `websites`.
 *
 * Migration 040 converts this into an explicit, intentional
 * website:read check owned by website_pages itself -- hardening, not a
 * fix for a currently-exploitable gap. All tests below already pass
 * against the pre-040 database; they must keep passing after 040
 * deploys, proving the explicit check produces the identical outcome
 * the accidental one already did, with the DELETE-authorization nuance
 * (see migration 040's own comments) preserved exactly.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'website-pages-select-authorization.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-wp-${RUN_ID}`

interface RoleUser {
  userId: string
  client: SupabaseClient
}

let studioId: string
let clientUserIds: string[] = []
let owner: RoleUser
let photographer: RoleUser
let teamMember: RoleUser
let editor: RoleUser
let websiteId: string
let pageId: string
let publishedWebsiteId: string
let publishedPageId: string

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
  const { data: studio, error: studioError } = await admin
    .from('studios')
    .insert({ name: RUN_TAG, slug: RUN_TAG, owner_id: null })
    .select('id')
    .single()
  if (studioError || !studio) throw new Error(`Failed to create test studio: ${studioError?.message}`)
  studioId = studio.id

  owner = await createRoleUser('owner', 'studio_owner', studioId)
  await admin.from('studios').update({ owner_id: owner.userId }).eq('id', studioId)
  photographer = await createRoleUser('photographer', 'photographer', studioId)
  teamMember = await createRoleUser('teammember', 'team_member', studioId)
  editor = await createRoleUser('editor', 'editor', studioId)

  const { data: website } = await admin
    .from('websites')
    .insert({ studio_id: studioId, name: RUN_TAG, subdomain: `${RUN_TAG}-w`, status: 'draft' })
    .select('id')
    .single()
  websiteId = website!.id

  const { data: page } = await admin
    .from('website_pages')
    .insert({ website_id: websiteId, name: RUN_TAG, path: '/', is_published: false, content: {} })
    .select('id')
    .single()
  pageId = page!.id

  const { data: publishedWebsite } = await admin
    .from('websites')
    .insert({ studio_id: studioId, name: `${RUN_TAG}-pub`, subdomain: `${RUN_TAG}-pub`, status: 'published' })
    .select('id')
    .single()
  publishedWebsiteId = publishedWebsite!.id

  const { data: publishedPage } = await admin
    .from('website_pages')
    .insert({ website_id: publishedWebsiteId, name: `${RUN_TAG}-pub`, path: '/', is_published: true, content: {} })
    .select('id')
    .single()
  publishedPageId = publishedPage!.id
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

describe('website_pages SELECT: UNAUTHORIZED (editor lacks website:read)', () => {
  it('editor cannot SELECT website_pages directly via PostgREST', async () => {
    const { data } = await editor.client.from('website_pages').select('id').eq('id', pageId)
    expect(data ?? []).toEqual([])
  })
})

describe('website_pages SELECT: AUTHORIZED (holds website:read)', () => {
  it('team_member can SELECT website_pages', async () => {
    const { data } = await teamMember.client.from('website_pages').select('id').eq('id', pageId)
    expect(data).toHaveLength(1)
  })

  it('photographer can SELECT website_pages', async () => {
    const { data } = await photographer.client.from('website_pages').select('id').eq('id', pageId)
    expect(data).toHaveLength(1)
  })

  it('studio_owner can SELECT website_pages', async () => {
    const { data } = await owner.client.from('website_pages').select('id').eq('id', pageId)
    expect(data).toHaveLength(1)
  })
})

describe('website_pages SELECT: public policy untouched', () => {
  it('an unauthenticated (anon) request can still read a published page of a published website', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await anon.from('website_pages').select('id').eq('id', publishedPageId)
    expect(data).toHaveLength(1)
  })

  it('an unauthenticated (anon) request cannot read the unpublished page', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await anon.from('website_pages').select('id').eq('id', pageId)
    expect(data ?? []).toEqual([])
  })
})

describe('website_pages writes: unchanged by the SELECT decomposition', () => {
  it('studio_owner can still create a page', async () => {
    const { data, error } = await owner.client
      .from('website_pages')
      .insert({ website_id: websiteId, name: `${RUN_TAG}-new`, path: '/new', is_published: false, content: {} })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
    if (data?.id) await admin.from('website_pages').delete().eq('id', data.id)
  })

  it('studio_owner can still update a page', async () => {
    const { error } = await owner.client
      .from('website_pages')
      .update({ name: `${RUN_TAG}-renamed` })
      .eq('id', pageId)
    expect(error).toBeNull()
  })

  it('editor (lacking website:update) still cannot create a page (write authorization unchanged)', async () => {
    const { data, error } = await editor.client
      .from('website_pages')
      .insert({ website_id: websiteId, name: `${RUN_TAG}-editor-attempt`, path: '/editor', is_published: false, content: {} })
      .select('id')
      .single()
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})

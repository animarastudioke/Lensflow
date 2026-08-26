import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 8 Target 1 acceptance test for migration 042
 * (042_website_pages_delete_role_enforcement.sql).
 *
 * Phase 7 reconnaissance live-confirmed that the pre-042 DELETE policy
 * (USING is_studio_member(w.studio_id)) let photographer and team_member
 * delete any website page in their own studio via a direct PostgREST call,
 * bypassing deleteWebsitePage()'s app-layer requireStudioPermission
 * ('website:manage_pages') check entirely -- because that check is only
 * ever reached by going through the Server Action, and nothing stops a
 * caller with a valid session JWT from calling
 * `supabase.from('website_pages').delete()` directly instead.
 *
 * Migration 042 changes the DELETE policy's USING clause to
 * has_studio_permission(w.studio_id, 'website:manage_pages') -- the same
 * permission the Server Action already requires -- so the DB boundary now
 * matches the app boundary. This file proves that directly: every test
 * below calls `.from('website_pages').delete()` on a scoped client, never
 * deleteWebsitePage() itself, specifically to prove the DB layer alone
 * (not the Server Action) now enforces the correct boundary.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'website-pages-delete-authorization.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-wpd-${RUN_ID}`

interface RoleUser {
  userId: string
  client: SupabaseClient
}

let studioId: string
let otherStudioId: string
let clientUserIds: string[] = []
let owner: RoleUser
let photographer: RoleUser
let teamMember: RoleUser
let editor: RoleUser
let crossStudioOwner: RoleUser
let websiteId: string

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

async function makePage(suffix: string, isPublished: boolean): Promise<string> {
  const { data, error } = await admin
    .from('website_pages')
    .insert({ website_id: websiteId, name: `${RUN_TAG}-${suffix}`, path: `/${suffix}`, is_published: isPublished, content: {} })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create page ${suffix}: ${error?.message}`)
  return data.id
}

async function pageExists(pageId: string): Promise<boolean> {
  const { data } = await admin.from('website_pages').select('id').eq('id', pageId).maybeSingle()
  return !!data
}

beforeAll(async () => {
  const { data: studio, error: studioError } = await admin
    .from('studios')
    .insert({ name: RUN_TAG, slug: RUN_TAG, owner_id: null })
    .select('id')
    .single()
  if (studioError || !studio) throw new Error(`Failed to create test studio: ${studioError?.message}`)
  studioId = studio.id

  const { data: otherStudio, error: otherStudioError } = await admin
    .from('studios')
    .insert({ name: `${RUN_TAG}-other`, slug: `${RUN_TAG}-other`, owner_id: null })
    .select('id')
    .single()
  if (otherStudioError || !otherStudio) throw new Error(`Failed to create other test studio: ${otherStudioError?.message}`)
  otherStudioId = otherStudio.id

  owner = await createRoleUser('owner', 'studio_owner', studioId)
  await admin.from('studios').update({ owner_id: owner.userId }).eq('id', studioId)
  photographer = await createRoleUser('photographer', 'photographer', studioId)
  teamMember = await createRoleUser('teammember', 'team_member', studioId)
  editor = await createRoleUser('editor', 'editor', studioId)
  crossStudioOwner = await createRoleUser('crossowner', 'studio_owner', otherStudioId)

  const { data: website, error: websiteError } = await admin
    .from('websites')
    .insert({ studio_id: studioId, name: RUN_TAG, subdomain: `${RUN_TAG}-w`, status: 'draft' })
    .select('id')
    .single()
  if (websiteError || !website) throw new Error(`Failed to create test website: ${websiteError?.message}`)
  websiteId = website.id
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
  if (otherStudioId) await admin.from('studios').delete().eq('id', otherStudioId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

describe('website_pages DELETE: AUTHORIZED (studio_owner)', () => {
  it('studio_owner can delete a page', async () => {
    const pageId = await makePage('owner-target', false)
    const { error } = await owner.client.from('website_pages').delete().eq('id', pageId)
    expect(error).toBeNull()
    expect(await pageExists(pageId)).toBe(false)
  })
})

describe('website_pages DELETE: UNAUTHORIZED (lacks website:manage_pages)', () => {
  it('photographer cannot delete a page (page still exists after)', async () => {
    const pageId = await makePage('photographer-target', false)
    await photographer.client.from('website_pages').delete().eq('id', pageId)
    expect(await pageExists(pageId)).toBe(true)
  })

  it('team_member cannot delete a page (page still exists after)', async () => {
    const pageId = await makePage('teammember-target', false)
    await teamMember.client.from('website_pages').delete().eq('id', pageId)
    expect(await pageExists(pageId)).toBe(true)
  })

  it('editor cannot delete a page (page still exists after)', async () => {
    const pageId = await makePage('editor-target', false)
    await editor.client.from('website_pages').delete().eq('id', pageId)
    expect(await pageExists(pageId)).toBe(true)
  })

  it('a studio_owner from another studio cannot delete this studio\'s page (tenant isolation)', async () => {
    const pageId = await makePage('cross-studio-target', false)
    await crossStudioOwner.client.from('website_pages').delete().eq('id', pageId)
    expect(await pageExists(pageId)).toBe(true)
  })

  it('anonymous cannot delete the page', async () => {
    const pageId = await makePage('anon-target', false)
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    await anon.from('website_pages').delete().eq('id', pageId)
    expect(await pageExists(pageId)).toBe(true)
  })

  it('published page cannot be deleted by an unauthorized role (photographer)', async () => {
    const pageId = await makePage('published-target', true)
    await photographer.client.from('website_pages').delete().eq('id', pageId)
    expect(await pageExists(pageId)).toBe(true)
  })

  it('unpublished page cannot be deleted by an unauthorized role (team_member)', async () => {
    const pageId = await makePage('unpublished-target', false)
    await teamMember.client.from('website_pages').delete().eq('id', pageId)
    expect(await pageExists(pageId)).toBe(true)
  })
})

describe('website_pages: SELECT/INSERT/UPDATE unchanged by the DELETE-only migration', () => {
  it('SELECT: team_member (holds website:read) can still read pages', async () => {
    const pageId = await makePage('select-check', false)
    const { data } = await teamMember.client.from('website_pages').select('id').eq('id', pageId)
    expect(data).toHaveLength(1)
  })

  it('SELECT: editor (lacks website:read) still cannot read pages', async () => {
    const pageId = await makePage('select-check-editor', false)
    const { data } = await editor.client.from('website_pages').select('id').eq('id', pageId)
    expect(data ?? []).toEqual([])
  })

  it('INSERT: studio_owner can still create a page', async () => {
    const { data, error } = await owner.client
      .from('website_pages')
      .insert({ website_id: websiteId, name: `${RUN_TAG}-insert-check`, path: '/insert-check', is_published: false, content: {} })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
  })

  it('INSERT: editor (lacks website:update) still cannot create a page', async () => {
    const { data, error } = await editor.client
      .from('website_pages')
      .insert({ website_id: websiteId, name: `${RUN_TAG}-insert-check-editor`, path: '/insert-check-editor', is_published: false, content: {} })
      .select('id')
      .single()
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('UPDATE: studio_owner can still update a page', async () => {
    const pageId = await makePage('update-check', false)
    const { error } = await owner.client
      .from('website_pages')
      .update({ name: `${RUN_TAG}-update-check-renamed` })
      .eq('id', pageId)
    expect(error).toBeNull()
  })

  it('UPDATE: photographer (lacks website:update) still cannot update a page', async () => {
    const pageId = await makePage('update-check-photographer', false)
    const { error } = await photographer.client
      .from('website_pages')
      .update({ name: `${RUN_TAG}-update-check-photographer-renamed` })
      .eq('id', pageId)
    // RLS silently filters the row rather than erroring; assert the row is unchanged instead.
    const { data } = await admin.from('website_pages').select('name').eq('id', pageId).single()
    expect(data?.name).toBe(`${RUN_TAG}-update-check-photographer`)
    void error
  })
})

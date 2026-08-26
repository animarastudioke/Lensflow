import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 10 Target 1 acceptance test for migration
 * 044_phase10_authorization_hardening.sql.
 *
 * Phase 9 reconnaissance live-confirmed that the pre-044 galleries policy
 * (a single FOR ALL, USING/WITH CHECK both is_studio_member(studio_id))
 * let any active studio member -- including team_member and editor --
 * INSERT a new gallery (bypassing app-layer quota/entitlement checks) and
 * hard-DELETE any gallery (cascading to gallery_share_settings,
 * gallery_albums, and media), via direct PostgREST, bypassing the app's
 * own checkGalleryPermission() gate in src/lib/actions/galleries.ts.
 *
 * Migration 044 decomposes this into permission-gated INSERT/UPDATE/DELETE
 * policies matching checkGalleryPermission()'s actual currently-enforced
 * role set (owner+photographer create; owner+photographer+team_member
 * update; owner-only delete). This file proves that directly: every test
 * below calls `.from('galleries')` on a scoped client, never
 * createGallery()/updateGallery()/deleteGallery() themselves, specifically
 * to prove the DB layer alone now enforces the correct boundary.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'galleries-authorization.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-gal10-${RUN_ID}`

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

async function makeGallery(suffix: string): Promise<string> {
  const { data, error } = await admin
    .from('galleries')
    .insert({ studio_id: studioId, name: `${RUN_TAG}-${suffix}`, type: 'wedding', status: 'draft', share_token: crypto.randomUUID() })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create gallery ${suffix}: ${error?.message}`)
  return data.id
}

async function galleryExists(id: string): Promise<boolean> {
  const { data } = await admin.from('galleries').select('id').eq('id', id).maybeSingle()
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
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
  if (otherStudioId) await admin.from('studios').delete().eq('id', otherStudioId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

describe('galleries INSERT: matches checkGalleryPermission() (owner + photographer only)', () => {
  it('studio_owner can create a gallery', async () => {
    const { data, error } = await owner.client
      .from('galleries')
      .insert({ studio_id: studioId, name: `${RUN_TAG}-owner-insert`, type: 'wedding', status: 'draft', share_token: crypto.randomUUID() })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
  })

  it('photographer can create a gallery', async () => {
    const { data, error } = await photographer.client
      .from('galleries')
      .insert({ studio_id: studioId, name: `${RUN_TAG}-photo-insert`, type: 'wedding', status: 'draft', share_token: crypto.randomUUID() })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
  })

  it('team_member cannot create a gallery', async () => {
    const { data, error } = await teamMember.client
      .from('galleries')
      .insert({ studio_id: studioId, name: `${RUN_TAG}-team-insert`, type: 'wedding', status: 'draft', share_token: crypto.randomUUID() })
      .select('id')
      .maybeSingle()
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('editor cannot create a gallery', async () => {
    const { data, error } = await editor.client
      .from('galleries')
      .insert({ studio_id: studioId, name: `${RUN_TAG}-editor-insert`, type: 'wedding', status: 'draft', share_token: crypto.randomUUID() })
      .select('id')
      .maybeSingle()
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('a studio_owner from another studio cannot insert into this studio (tenant isolation)', async () => {
    const { data, error } = await crossStudioOwner.client
      .from('galleries')
      .insert({ studio_id: studioId, name: `${RUN_TAG}-cross-insert`, type: 'wedding', status: 'draft', share_token: crypto.randomUUID() })
      .select('id')
      .maybeSingle()
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('anonymous cannot create a gallery', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await anon
      .from('galleries')
      .insert({ studio_id: studioId, name: `${RUN_TAG}-anon-insert`, type: 'wedding', status: 'draft', share_token: crypto.randomUUID() })
      .select('id')
      .maybeSingle()
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})

describe('galleries UPDATE: matches checkGalleryPermission() (owner + photographer + team_member)', () => {
  it('studio_owner can update a gallery', async () => {
    const id = await makeGallery('owner-update')
    const { error } = await owner.client.from('galleries').update({ name: `${RUN_TAG}-owner-updated` }).eq('id', id)
    expect(error).toBeNull()
    const { data } = await admin.from('galleries').select('name').eq('id', id).single()
    expect(data?.name).toBe(`${RUN_TAG}-owner-updated`)
  })

  it('photographer can update a gallery', async () => {
    const id = await makeGallery('photo-update')
    const { error } = await photographer.client.from('galleries').update({ name: `${RUN_TAG}-photo-updated` }).eq('id', id)
    expect(error).toBeNull()
    const { data } = await admin.from('galleries').select('name').eq('id', id).single()
    expect(data?.name).toBe(`${RUN_TAG}-photo-updated`)
  })

  it('team_member can update a gallery', async () => {
    const id = await makeGallery('team-update')
    const { error } = await teamMember.client.from('galleries').update({ name: `${RUN_TAG}-team-updated` }).eq('id', id)
    expect(error).toBeNull()
    const { data } = await admin.from('galleries').select('name').eq('id', id).single()
    expect(data?.name).toBe(`${RUN_TAG}-team-updated`)
  })

  it('editor cannot update a gallery (matches checkGalleryPermission(), which does not grant editor galleries.edit)', async () => {
    const id = await makeGallery('editor-update')
    await editor.client.from('galleries').update({ name: `${RUN_TAG}-should-not-change` }).eq('id', id)
    const { data } = await admin.from('galleries').select('name').eq('id', id).single()
    expect(data?.name).toBe(`${RUN_TAG}-editor-update`)
  })

  it('a studio_owner from another studio cannot update this studio\'s gallery (tenant isolation)', async () => {
    const id = await makeGallery('cross-update')
    await crossStudioOwner.client.from('galleries').update({ name: `${RUN_TAG}-should-not-change` }).eq('id', id)
    const { data } = await admin.from('galleries').select('name').eq('id', id).single()
    expect(data?.name).toBe(`${RUN_TAG}-cross-update`)
  })
})

describe('galleries DELETE: owner-only (hard delete, cascades to media/albums/share-settings)', () => {
  it('studio_owner can delete a gallery', async () => {
    const id = await makeGallery('owner-delete')
    const { error } = await owner.client.from('galleries').delete().eq('id', id)
    expect(error).toBeNull()
    expect(await galleryExists(id)).toBe(false)
  })

  it('photographer cannot delete a gallery (galleries:delete is owner-only)', async () => {
    const id = await makeGallery('photo-delete')
    await photographer.client.from('galleries').delete().eq('id', id)
    expect(await galleryExists(id)).toBe(true)
  })

  it('team_member cannot delete a gallery', async () => {
    const id = await makeGallery('team-delete')
    await teamMember.client.from('galleries').delete().eq('id', id)
    expect(await galleryExists(id)).toBe(true)
  })

  it('editor cannot delete a gallery', async () => {
    const id = await makeGallery('editor-delete')
    await editor.client.from('galleries').delete().eq('id', id)
    expect(await galleryExists(id)).toBe(true)
  })

  it('a studio_owner from another studio cannot delete this studio\'s gallery (tenant isolation)', async () => {
    const id = await makeGallery('cross-delete')
    await crossStudioOwner.client.from('galleries').delete().eq('id', id)
    expect(await galleryExists(id)).toBe(true)
  })

  it('anonymous cannot delete a gallery', async () => {
    const id = await makeGallery('anon-delete')
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    await anon.from('galleries').delete().eq('id', id)
    expect(await galleryExists(id)).toBe(true)
  })
})

describe('galleries: SELECT unchanged by this migration', () => {
  it('team_member can still read galleries in their own studio', async () => {
    const id = await makeGallery('select-check')
    const { data } = await teamMember.client.from('galleries').select('id').eq('id', id)
    expect(data).toHaveLength(1)
  })

  it('a non-member cannot read galleries in a studio they do not belong to', async () => {
    const id = await makeGallery('select-check-nonmember')
    const { data } = await crossStudioOwner.client.from('galleries').select('id').eq('id', id)
    expect(data ?? []).toEqual([])
  })
})

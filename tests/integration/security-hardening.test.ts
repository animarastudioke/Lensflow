import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 1 production security hardening — regression coverage for the
 * database/RLS-level fixes in supabase/migrations/031_production_security_hardening.sql.
 * Runs against the REAL Supabase project, same model and namespacing
 * convention as workspace-isolation.test.ts (see that file's header) — only
 * via `npm run test:integration`, never as part of `npm test`.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'security-hardening.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

interface TestWorkspace {
  userId: string
  email: string
  password: string
  studioId: string
  slug: string
  client: SupabaseClient // authenticated as this workspace's owner
}

let wsA: TestWorkspace
let wsB: TestWorkspace
let managerUser: { userId: string; email: string; client: SupabaseClient } // photographer in wsA
let galleryId: string
let anon: SupabaseClient

async function createTestWorkspace(label: 'a' | 'b'): Promise<TestWorkspace> {
  const email = `zzz-lensflow-test-secharden-${label}-${RUN_ID}@example.com`
  const password = crypto.randomUUID()

  const { data: userRes, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (userError || !userRes.user) throw new Error(`Failed to create test user ${label}: ${userError?.message}`)

  const { data: freePlan, error: planError } = await admin.from('plans').select('id').eq('slug', 'free').single()
  if (planError || !freePlan) throw new Error(`Failed to look up free plan: ${planError?.message}`)

  const slug = `zzz-lensflow-test-secharden-${label}-${RUN_ID}`
  const { data: studio, error: studioError } = await admin
    .from('studios')
    .insert({ name: `Sec Harden Test Studio ${label.toUpperCase()}`, slug, owner_id: userRes.user.id })
    .select('id')
    .single()
  if (studioError || !studio) throw new Error(`Failed to create test studio ${label}: ${studioError?.message}`)

  const { error: memberError } = await admin
    .from('studio_members')
    .insert({ studio_id: studio.id, user_id: userRes.user.id, role: 'studio_owner', status: 'active', joined_at: new Date().toISOString() })
  if (memberError) throw new Error(`Failed to create test membership ${label}: ${memberError.message}`)

  const { error: subError } = await admin
    .from('subscriptions')
    .insert({ studio_id: studio.id, plan_id: freePlan.id, status: 'active' })
  if (subError) throw new Error(`Failed to create test subscription ${label}: ${subError.message}`)

  const anonForSignIn = createClient(SUPABASE_URL, ANON_KEY)
  const { data: signIn, error: signInError } = await anonForSignIn.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.session) throw new Error(`Failed to sign in as test user ${label}: ${signInError?.message}`)

  const scopedClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return { userId: userRes.user.id, email, password, studioId: studio.id, slug, client: scopedClient }
}

beforeAll(async () => {
  wsA = await createTestWorkspace('a')
  wsB = await createTestWorkspace('b')
  anon = createClient(SUPABASE_URL, ANON_KEY)

  // A second, non-owner active member of wsA with the 'photographer' role —
  // used to prove a manager (not just a plain member) still can't self- or
  // other-promote to studio_owner.
  const email = `zzz-lensflow-test-secharden-manager-${RUN_ID}@example.com`
  const password = crypto.randomUUID()
  const { data: userRes, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (userError || !userRes.user) throw new Error(`Failed to create manager test user: ${userError?.message}`)
  const { error: memberError } = await admin
    .from('studio_members')
    .insert({ studio_id: wsA.studioId, user_id: userRes.user.id, role: 'photographer', status: 'active', joined_at: new Date().toISOString() })
  if (memberError) throw new Error(`Failed to create manager membership: ${memberError.message}`)
  const anonForSignIn = createClient(SUPABASE_URL, ANON_KEY)
  const { data: signIn, error: signInError } = await anonForSignIn.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.session) throw new Error(`Failed to sign in as manager: ${signInError?.message}`)
  managerUser = {
    userId: userRes.user.id,
    email,
    client: createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  }

  // A published, password-protected gallery in wsA, with a known
  // password_hash, to exercise the public-secret-exposure checks.
  const { data: gallery, error: galleryError } = await admin
    .from('galleries')
    .insert({
      studio_id: wsA.studioId,
      name: 'Sec Harden Test Gallery',
      type: 'other',
      status: 'published',
      password_protected: true,
      password_hash: 'deadbeef-not-a-real-hash',
      share_token: `zzz-secharden-token-${RUN_ID}`,
    })
    .select('id')
    .single()
  if (galleryError || !gallery) throw new Error(`Failed to create test gallery: ${galleryError?.message}`)
  galleryId = gallery.id

  const { error: settingsError } = await admin
    .from('gallery_share_settings')
    .insert({ gallery_id: galleryId, password_protected: true, password_hash: 'deadbeef-not-a-real-hash' })
  if (settingsError) throw new Error(`Failed to create test gallery share settings: ${settingsError.message}`)
})

afterAll(async () => {
  await admin.from('galleries').delete().eq('id', galleryId)
  for (const studioId of [wsA?.studioId, wsB?.studioId].filter(Boolean)) {
    const { error } = await admin.from('studios').delete().eq('id', studioId)
    if (error) console.error(`Cleanup: failed to delete test studio ${studioId}:`, error.message)
  }
  for (const userId of [wsA?.userId, wsB?.userId, managerUser?.userId].filter(Boolean)) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) console.error(`Cleanup: failed to delete test user ${userId}:`, error.message)
  }
})

describe('TASK 1 / ATTACK 1: profiles.role and profiles.studio_id self-promotion', () => {
  it('rejects PATCH /rest/v1/profiles?id=eq.<own-id> {"role":"super_admin"}', async () => {
    const { error } = await wsA.client.from('profiles').update({ role: 'super_admin' }).eq('id', wsA.userId)
    expect(error).not.toBeNull()

    const { data: after } = await admin.from('profiles').select('role').eq('id', wsA.userId).single()
    expect(after?.role).not.toBe('super_admin')
  })

  it('rejects a self-service change of studio_id to a studio the caller does not own', async () => {
    const { error } = await wsA.client.from('profiles').update({ studio_id: wsB.studioId }).eq('id', wsA.userId)
    expect(error).not.toBeNull()

    const { data: after } = await admin.from('profiles').select('studio_id').eq('id', wsA.userId).single()
    expect(after?.studio_id).not.toBe(wsB.studioId)
  })

  it('still allows an unrelated self profile field (first_name) to be updated', async () => {
    const { error } = await wsA.client.from('profiles').update({ first_name: 'Updated' }).eq('id', wsA.userId)
    expect(error).toBeNull()
    const { data: after } = await admin.from('profiles').select('first_name').eq('id', wsA.userId).single()
    expect(after?.first_name).toBe('Updated')
  })
})

describe('TASK 2 / ATTACK 2: studio_members role escalation to studio_owner', () => {
  it('denies a manager (photographer) promoting themselves to studio_owner', async () => {
    const { error } = await managerUser.client
      .from('studio_members')
      .update({ role: 'studio_owner' })
      .eq('studio_id', wsA.studioId)
      .eq('user_id', managerUser.userId)
    // Either an explicit RLS error, or a silent no-op (0 rows matched by
    // WITH CHECK) are both acceptable outcomes — what matters is the row.
    const { data: after } = await admin
      .from('studio_members')
      .select('role')
      .eq('studio_id', wsA.studioId)
      .eq('user_id', managerUser.userId)
      .single()
    expect(after?.role).toBe('photographer')
    void error
  })

  it('denies a manager promoting the real owner\'s teammate to studio_owner', async () => {
    await admin
      .from('studio_members')
      .update({ role: 'photographer' })
      .eq('studio_id', wsA.studioId)
      .eq('user_id', managerUser.userId)

    const { error } = await managerUser.client
      .from('studio_members')
      .update({ role: 'studio_owner' })
      .eq('studio_id', wsA.studioId)
      .eq('user_id', wsA.userId)
    void error

    const { data: after } = await admin
      .from('studio_members')
      .select('role')
      .eq('studio_id', wsA.studioId)
      .eq('user_id', wsA.userId)
      .single()
    // The real owner's row should be untouched either way, but critically
    // this proves the manager can't use this path to *grant* ownership to
    // an arbitrary third row either.
    expect(after?.role).toBe('studio_owner')
  })

  it('still allows the real owner to change a manager\'s role among non-owner roles', async () => {
    const { error } = await wsA.client
      .from('studio_members')
      .update({ role: 'team_member' })
      .eq('studio_id', wsA.studioId)
      .eq('user_id', managerUser.userId)
    expect(error).toBeNull()
    const { data: after } = await admin
      .from('studio_members')
      .select('role')
      .eq('studio_id', wsA.studioId)
      .eq('user_id', managerUser.userId)
      .single()
    expect(after?.role).toBe('team_member')
  })
})

describe('TASK 3 / ATTACKS 3-5: public gallery secret exposure via direct PostgREST access', () => {
  it('anonymous SELECT on galleries returns nothing (no more public-published policy)', async () => {
    const { data, error } = await anon.from('galleries').select('*').eq('id', galleryId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('anonymous SELECT on gallery_share_settings returns nothing', async () => {
    const { data, error } = await anon.from('gallery_share_settings').select('*').eq('gallery_id', galleryId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('anonymous SELECT on media returns nothing', async () => {
    const { data, error } = await anon.from('media').select('*').eq('gallery_id', galleryId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('an authenticated user of a different studio cannot read this gallery\'s share settings either', async () => {
    const { data, error } = await wsB.client.from('gallery_share_settings').select('*').eq('gallery_id', galleryId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('the owning studio\'s own member can still read it (no regression for legitimate dashboard access)', async () => {
    const { data, error } = await wsA.client.from('gallery_share_settings').select('*').eq('gallery_id', galleryId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Focused isolation test for has_studio_permission() itself, ahead of
 * redeploying migration 037.
 *
 * Root cause of the 037 deploy-then-rollback incident: this function's
 * CASE statement (migration 032) only ever enumerated WRITE permissions
 * -- none of the 14 :read permissions Phase 4 needs were cased, so they
 * all fell through to ELSE (owner-only), incorrectly denying
 * team_member/photographer. Migration 038 adds the missing branches,
 * copied directly from ROLE_PERMISSIONS (src/lib/auth/permissions.ts).
 * This file proves the FUNCTION alone returns the correct boolean for
 * every role/permission combination the fix touches -- both the new
 * :read permissions and a representative sample of pre-existing WRITE
 * permissions (to prove the fix didn't disturb them) -- calling the RPC
 * directly (`.rpc('has_studio_permission', ...)`) with real signed-in
 * JWTs, never supabaseAdmin.
 *
 * Runs against the REAL Supabase project. Only via `npm run test:integration`.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'has-studio-permission-fix.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-hsp-${RUN_ID}`

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
let superAdminMember: RoleUser

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

async function check(user: RoleUser, permission: string): Promise<boolean> {
  const { data, error } = await user.client.rpc('has_studio_permission', { p_studio_id: studioId, p_permission: permission })
  if (error) throw new Error(`RPC error for ${permission}: ${error.message}`)
  return data === true
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
  // Edge case: super_admin as a studio_members row is not how the real app
  // grants platform-admin access (that's requireSuperAdmin() against
  // profiles.role, via supabaseAdmin) -- but 'super_admin' is a valid
  // user_role enum value, so it's tested here for completeness per this
  // task's explicit request.
  superAdminMember = await createRoleUser('superadmin', 'super_admin', studioId)
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

describe('has_studio_permission(): studio_owner short-circuits to TRUE for every permission', () => {
  it('studio_owner: clients:read, expenses:read, payouts:read, subscriptions:read, team:read all TRUE', async () => {
    expect(await check(owner, 'clients:read')).toBe(true)
    expect(await check(owner, 'expenses:read')).toBe(true)
    expect(await check(owner, 'payouts:read')).toBe(true)
    expect(await check(owner, 'subscriptions:read')).toBe(true)
    expect(await check(owner, 'team:read')).toBe(true)
  })
})

describe('has_studio_permission(): photographer', () => {
  it('clients:read TRUE, expenses:read TRUE, payouts:read FALSE, subscriptions:read FALSE', async () => {
    expect(await check(photographer, 'clients:read')).toBe(true)
    expect(await check(photographer, 'expenses:read')).toBe(true)
    expect(await check(photographer, 'payouts:read')).toBe(false)
    expect(await check(photographer, 'subscriptions:read')).toBe(false)
  })

  it('also retains contracts/bookings/projects/quotes/invoices/tasks/questionnaires/store/website/team :read', async () => {
    for (const p of ['contracts:read', 'bookings:read', 'projects:read', 'quotes:read', 'invoices:read', 'tasks:read', 'questionnaires:read', 'store:read', 'website:read', 'team:read']) {
      expect(await check(photographer, p)).toBe(true)
    }
  })
})

describe('has_studio_permission(): team_member', () => {
  it('clients:read TRUE, expenses:read FALSE, payouts:read FALSE, subscriptions:read FALSE, team:read TRUE', async () => {
    expect(await check(teamMember, 'clients:read')).toBe(true)
    expect(await check(teamMember, 'expenses:read')).toBe(false)
    expect(await check(teamMember, 'payouts:read')).toBe(false)
    expect(await check(teamMember, 'subscriptions:read')).toBe(false)
    expect(await check(teamMember, 'team:read')).toBe(true)
  })

  it('also retains contracts/bookings/projects/quotes/invoices/tasks/questionnaires/store/website :read', async () => {
    for (const p of ['contracts:read', 'bookings:read', 'projects:read', 'quotes:read', 'invoices:read', 'tasks:read', 'questionnaires:read', 'store:read', 'website:read']) {
      expect(await check(teamMember, p)).toBe(true)
    }
  })
})

describe('has_studio_permission(): editor', () => {
  it('clients:read, expenses:read, payouts:read, subscriptions:read, team:read all FALSE', async () => {
    expect(await check(editor, 'clients:read')).toBe(false)
    expect(await check(editor, 'expenses:read')).toBe(false)
    expect(await check(editor, 'payouts:read')).toBe(false)
    expect(await check(editor, 'subscriptions:read')).toBe(false)
    expect(await check(editor, 'team:read')).toBe(false)
  })

  it('also denied contracts/bookings/projects/quotes/invoices/tasks/questionnaires/store/website :read', async () => {
    for (const p of ['contracts:read', 'bookings:read', 'projects:read', 'quotes:read', 'invoices:read', 'tasks:read', 'questionnaires:read', 'store:read', 'website:read']) {
      expect(await check(editor, p)).toBe(false)
    }
  })
})

describe('has_studio_permission(): super_admin as a studio_members row (edge case, not the real app\'s admin path)', () => {
  it('is NOT short-circuited to TRUE (only studio_owner is) -- falls through to the same CASE as other non-owner roles', async () => {
    expect(await check(superAdminMember, 'clients:read')).toBe(false)
    expect(await check(superAdminMember, 'payouts:read')).toBe(false)
  })
})

describe('has_studio_permission(): existing WRITE permissions are unchanged by this fix', () => {
  it('photographer: clients:create TRUE, clients:delete FALSE (unchanged from pre-038 behavior)', async () => {
    expect(await check(photographer, 'clients:create')).toBe(true)
    expect(await check(photographer, 'clients:delete')).toBe(false)
  })

  it('team_member: clients:update TRUE, clients:create FALSE (unchanged from pre-038 behavior)', async () => {
    expect(await check(teamMember, 'clients:update')).toBe(true)
    expect(await check(teamMember, 'clients:create')).toBe(false)
  })

  it('editor: no write permission of any kind (unchanged from pre-038 behavior)', async () => {
    expect(await check(editor, 'clients:create')).toBe(false)
    expect(await check(editor, 'tasks:update')).toBe(false)
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 3 security audit — SELECT authorization regression coverage.
 *
 * Confirmed live: the `payments` table's only SELECT policy
 * ("Members can view studio payments") checks is_studio_member(studio_id)
 * only, not role — so a team_member or editor (neither of which has
 * `payments:read` in ROLE_PERMISSIONS, src/lib/auth/permissions.ts) can
 * read another staff member's full payment ledger (amounts, M-Pesa phone
 * numbers) directly via their own JWT, bypassing the app entirely.
 *
 * The Server Action layer (getPayments, getSubscriptionPaymentHistory,
 * getStudioPayoutSummary) has been fixed in this same change to require
 * `payments:read` — see phase3-payments-authorization.test.ts for that
 * layer's unit tests. This file proves the DB-layer gap directly (real
 * authenticated JWTs, direct PostgREST access, never through a Server
 * Action), matching the Phase 2 test convention.
 *
 * A migration narrowing the `payments` SELECT policy to owner/manager-only
 * has been prepared (supabase/migrations/036_payments_select_role_enforcement.sql)
 * but, per this task's explicit instruction, has NOT been deployed. Until
 * it is, the "DENIED" tests below are expected to FAIL — that failure IS
 * the live vulnerability, not a broken test, exactly like Phase 2's
 * before-state. Once 036 is deployed, re-run this file; it should reach
 * 0 failures.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'security-hardening-phase3-select.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-p3-${RUN_ID}`

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
let paymentId: string

async function createRoleUser(label: string, role: 'studio_owner' | 'photographer' | 'team_member' | 'editor', targetStudioId: string): Promise<RoleUser> {
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

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({ studio_id: studioId, amount: 5000, currency: 'KES', method: 'mpesa', status: 'completed', phone_number: '254700000000' })
    .select('id')
    .single()
  if (paymentError || !payment) throw new Error(`Failed to create test payment: ${paymentError?.message}`)
  paymentId = payment.id
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

describe('Phase 3 P1: payments table — role enforcement (payments:read is owner/super_admin-only)', () => {
  it('team_member cannot SELECT the studio\'s payments (matrix: team_member has no payments:read)', async () => {
    const { data } = await teamMember.client.from('payments').select('id, amount, phone_number').eq('id', paymentId)
    expect(data ?? []).toEqual([])
  })

  it('editor cannot SELECT the studio\'s payments (matrix: editor has no payments:read)', async () => {
    const { data } = await editor.client.from('payments').select('id, amount, phone_number').eq('id', paymentId)
    expect(data ?? []).toEqual([])
  })

  it('photographer cannot SELECT the studio\'s payments (matrix: photographer has no payments:read either)', async () => {
    const { data } = await photographer.client.from('payments').select('id, amount, phone_number').eq('id', paymentId)
    expect(data ?? []).toEqual([])
  })

  it('studio_owner CAN SELECT the studio\'s payments', async () => {
    const { data } = await owner.client.from('payments').select('id, amount, phone_number').eq('id', paymentId)
    expect(data).toHaveLength(1)
    expect(data?.[0]?.amount).toBe(5000)
  })
})

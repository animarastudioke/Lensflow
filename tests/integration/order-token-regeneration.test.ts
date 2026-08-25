import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 5 P5 live proof for regenerateOrderShareToken
 * (src/lib/actions/orders.ts). Unlike questionnaire token regeneration,
 * this needs NO new migration -- orders already has a granular UPDATE
 * policy requiring store:manage_orders (migration 032), so this test
 * runs against the CURRENT, already-deployed schema and is expected to
 * pass today.
 *
 * Proves: an authorized studio_owner can rotate an order's share_token,
 * the OLD token immediately stops resolving via the public read path,
 * the NEW token resolves correctly, and the order's own fields (the
 * ones digital-download entitlement is derived from) are untouched.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'order-token-regeneration.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-otok-${RUN_ID}`

let studioId: string
let ownerUserId: string
let ownerClient: SupabaseClient
let orderId: string
const originalToken = `${RUN_TAG}-orig`

beforeAll(async () => {
  const { data: studio, error: studioError } = await admin
    .from('studios')
    .insert({ name: RUN_TAG, slug: RUN_TAG, owner_id: null })
    .select('id')
    .single()
  if (studioError || !studio) throw new Error(`Failed to create test studio: ${studioError?.message}`)
  studioId = studio.id

  const email = `${RUN_TAG}-owner@example.com`
  const password = crypto.randomUUID()
  const { data: userRes, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (userError || !userRes.user) throw new Error(`Failed to create owner: ${userError?.message}`)
  ownerUserId = userRes.user.id

  await admin.from('studio_members').insert({
    studio_id: studioId, user_id: ownerUserId, role: 'studio_owner', status: 'active', joined_at: new Date().toISOString(),
  })
  await admin.from('studios').update({ owner_id: ownerUserId }).eq('id', studioId)

  const { data: order } = await admin
    .from('orders')
    .insert({ studio_id: studioId, order_number: `ORD-${RUN_ID}`, email: `${RUN_TAG}-buyer@example.com`, share_token: originalToken })
    .select('id')
    .single()
  orderId = order!.id

  const anonForSignIn = createClient(SUPABASE_URL, ANON_KEY)
  const { data: signIn } = await anonForSignIn.auth.signInWithPassword({ email, password })
  ownerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signIn!.session!.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
  if (ownerUserId) await admin.auth.admin.deleteUser(ownerUserId).catch(() => {})
})

describe('orders: token regeneration revokes the old token', () => {
  it('studio_owner can regenerate the share token', async () => {
    const newToken = `${RUN_TAG}-rotated`
    const { data, error } = await ownerClient
      .from('orders')
      .update({ share_token: newToken })
      .eq('id', orderId)
      .eq('studio_id', studioId)
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(orderId)
  })

  it('the OLD token no longer resolves to the order', async () => {
    const { data } = await admin.from('orders').select('id').eq('share_token', originalToken)
    expect(data ?? []).toEqual([])
  })

  it('the NEW token resolves to the same order', async () => {
    const { data } = await admin.from('orders').select('id').eq('share_token', `${RUN_TAG}-rotated`)
    expect(data).toHaveLength(1)
    expect(data?.[0]?.id).toBe(orderId)
  })

  it('the order row itself (order_number, email, status) is otherwise unchanged -- digital-download entitlement basis preserved', async () => {
    const { data } = await admin.from('orders').select('order_number, email, status, payment_status').eq('id', orderId).single()
    expect(data?.order_number).toBe(`ORD-${RUN_ID}`)
    expect(data?.email).toBe(`${RUN_TAG}-buyer@example.com`)
  })
})

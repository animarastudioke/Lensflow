import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 12 Step 14: bookings is a production-critical, named audit domain
 * with no existing REAL (RLS-backed, JWT-signed) tenant-isolation test --
 * only bookings-projects-tenant-isolation.test.ts, which mocks the
 * Supabase client entirely and so proves the client_id cross-studio guard,
 * not that RLS itself denies a different studio's owner. Also directly
 * relevant to this step because Step 13 added a new `studios` lookup
 * inside createBooking() (the notification-link fix) -- this proves the
 * bookings table's own tenant boundary is intact independent of that
 * Server Action, matching the same real-JWT pattern already established
 * for invoices/galleries/websites/notifications.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error('booking-tenant-isolation.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).')
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-bookingtenant-${RUN_ID}`

interface RoleUser {
  userId: string
  client: SupabaseClient
}

let studioAId: string
let studioBId: string
let clientUserIds: string[] = []
let ownerA: RoleUser
let ownerB: RoleUser
let bookingAId: string

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

  const { data: bookingA } = await admin
    .from('bookings')
    .insert({ studio_id: studioAId, session_name: 'Real Session A', status: 'confirmed', total_price: 50000 })
    .select('id')
    .single()
  bookingAId = bookingA!.id
})

afterAll(async () => {
  if (studioAId) await admin.from('studios').delete().eq('id', studioAId)
  if (studioBId) await admin.from('studios').delete().eq('id', studioBId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

describe('bookings RLS: same-studio member can read/update their own booking', () => {
  it('owner A can read studio A\'s booking', async () => {
    const { data } = await ownerA.client.from('bookings').select('id, session_name').eq('id', bookingAId).single()
    expect(data?.id).toBe(bookingAId)
  })
})

describe('bookings RLS: cross-studio isolation (owner B against studio A\'s booking)', () => {
  it('owner B cannot read studio A\'s booking by id -- if I change the id in the request to Studio A\'s while authenticated as Studio B, nothing comes back', async () => {
    const { data } = await ownerB.client.from('bookings').select('id').eq('id', bookingAId)
    expect(data ?? []).toEqual([])
  })

  it('owner B cannot update studio A\'s booking (e.g. status or total_price)', async () => {
    const { data, error } = await ownerB.client
      .from('bookings')
      .update({ status: 'cancelled', total_price: 1 })
      .eq('id', bookingAId)
      .select('id')
    expect(data ?? []).toEqual([])
    expect(error).toBeNull() // RLS silently matches zero rows, matching this app's established pattern
    const { data: unchanged } = await admin.from('bookings').select('status, total_price').eq('id', bookingAId).single()
    expect(unchanged?.status).toBe('confirmed')
    expect(Number(unchanged?.total_price)).toBe(50000)
  })

  it('owner B cannot delete studio A\'s booking', async () => {
    const { error } = await ownerB.client.from('bookings').delete().eq('id', bookingAId)
    const { data: stillThere } = await admin.from('bookings').select('id').eq('id', bookingAId).maybeSingle()
    expect(stillThere?.id).toBe(bookingAId)
    expect(error).toBeNull()
  })
})

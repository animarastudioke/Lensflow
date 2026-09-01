import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 12 Step 12: notifications are studio-wide, not per-user (migration
 * 018's own comment: "there's no per-user read state to protect here").
 * The application layer (markNotificationRead/markAllNotificationsRead) is
 * already covered by phase2-notifications-authorization.test.ts, but that
 * suite mocks the Supabase client entirely -- it proves the app-layer check
 * runs, not that RLS itself actually enforces studio membership on SELECT.
 * This exercises the real notifications RLS policies (migration 018) with
 * real JWT-backed sessions: an active member of a studio can read that
 * studio's notifications, and a different studio's owner -- who holds every
 * permission that exists, just not in this studio -- gets nothing back.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error('notifications-tenant-isolation.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).')
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-notiftenant-${RUN_ID}`

interface RoleUser {
  userId: string
  client: SupabaseClient
}

let studioAId: string
let studioBId: string
let clientUserIds: string[] = []
let ownerA: RoleUser
let ownerB: RoleUser
let notificationAId: string

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

  const { data: notifA } = await admin
    .from('notifications')
    .insert({ studio_id: studioAId, type: 'booking_created', title: 'New booking', body: 'Real event for studio A' })
    .select('id')
    .single()
  notificationAId = notifA!.id
})

afterAll(async () => {
  if (studioAId) await admin.from('studios').delete().eq('id', studioAId)
  if (studioBId) await admin.from('studios').delete().eq('id', studioBId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

describe('notifications RLS: same-studio member can read and mark read', () => {
  it('owner A can read studio A\'s notification', async () => {
    const { data } = await ownerA.client.from('notifications').select('id, title').eq('id', notificationAId).single()
    expect(data?.id).toBe(notificationAId)
    expect(data?.title).toBe('New booking')
  })

  it('owner A can mark studio A\'s notification read', async () => {
    const { data, error } = await ownerA.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationAId)
      .select('read_at')
    expect(error).toBeNull()
    expect(data?.[0]?.read_at).not.toBeNull()
    await admin.from('notifications').update({ read_at: null }).eq('id', notificationAId) // reset for the isolation checks below
  })
})

describe('notifications RLS: cross-studio isolation (owner B against studio A\'s notification)', () => {
  it('owner B cannot read studio A\'s notification by id -- the same query the header dropdown runs returns nothing', async () => {
    const { data } = await ownerB.client.from('notifications').select('id').eq('id', notificationAId)
    expect(data ?? []).toEqual([])
  })

  it('owner B cannot list any of studio A\'s notifications by studio_id', async () => {
    const { data } = await ownerB.client.from('notifications').select('id').eq('studio_id', studioAId)
    expect(data ?? []).toEqual([])
  })

  it('owner B cannot mark studio A\'s notification read', async () => {
    const { data, error } = await ownerB.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationAId)
      .select('id')
    expect(data ?? []).toEqual([])
    expect(error).toBeNull() // RLS silently matches zero rows, matching this app's established pattern
    const { data: unchanged } = await admin.from('notifications').select('read_at').eq('id', notificationAId).single()
    expect(unchanged?.read_at).toBeNull()
  })
})

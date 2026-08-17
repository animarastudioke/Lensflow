import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Runs against the REAL Supabase project (no branch/staging tier is
 * available on this org's plan - see PR description). Only via
 * `npm run test:integration`, never as part of `npm test`. Everything it
 * creates is clearly namespaced (slug/email prefixed with
 * `zzz-lensflow-test-isolation-`) and torn down in afterAll regardless of
 * pass/fail, using the studios table's ON DELETE CASCADE to studio_members/
 * clients/galleries/subscriptions/payments/etc. so cleanup is two row
 * deletes plus two auth-user deletes, not one per table.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'workspace-isolation.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

interface TestWorkspace {
  userId: string
  email: string
  password: string
  studioId: string
  slug: string
  clientId: string
  client: SupabaseClient // authenticated as this workspace's owner
}

let wsA: TestWorkspace
let wsB: TestWorkspace
let anon: SupabaseClient

async function createTestWorkspace(label: 'a' | 'b'): Promise<TestWorkspace> {
  const email = `zzz-lensflow-test-isolation-${label}-${RUN_ID}@example.com`
  const password = crypto.randomUUID()

  const { data: userRes, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (userError || !userRes.user) throw new Error(`Failed to create test user ${label}: ${userError?.message}`)

  const { data: freePlan, error: planError } = await admin.from('plans').select('id').eq('slug', 'free').single()
  if (planError || !freePlan) throw new Error(`Failed to look up free plan: ${planError?.message}`)

  const slug = `zzz-lensflow-test-isolation-${label}-${RUN_ID}`
  const { data: studio, error: studioError } = await admin
    .from('studios')
    .insert({ name: `Isolation Test Studio ${label.toUpperCase()}`, slug, owner_id: userRes.user.id })
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

  const { data: client, error: clientError } = await admin
    .from('clients')
    .insert({ studio_id: studio.id, first_name: `Isolation${label.toUpperCase()}`, last_name: 'Test', email: `client-${label}-${RUN_ID}@example.com` })
    .select('id')
    .single()
  if (clientError || !client) throw new Error(`Failed to create test client ${label}: ${clientError?.message}`)

  const anonForSignIn = createClient(SUPABASE_URL, ANON_KEY)
  const { data: signIn, error: signInError } = await anonForSignIn.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.session) throw new Error(`Failed to sign in as test user ${label}: ${signInError?.message}`)

  const scopedClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return { userId: userRes.user.id, email, password, studioId: studio.id, slug, clientId: client.id, client: scopedClient }
}

beforeAll(async () => {
  wsA = await createTestWorkspace('a')
  wsB = await createTestWorkspace('b')
  anon = createClient(SUPABASE_URL, ANON_KEY)
})

afterAll(async () => {
  for (const studioId of [wsA?.studioId, wsB?.studioId].filter(Boolean)) {
    const { error } = await admin.from('studios').delete().eq('id', studioId)
    if (error) console.error(`Cleanup: failed to delete test studio ${studioId}:`, error.message)
  }
  for (const userId of [wsA?.userId, wsB?.userId].filter(Boolean)) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) console.error(`Cleanup: failed to delete test user ${userId}:`, error.message)
  }
})

describe('workspace isolation (RLS)', () => {
  it('sanity: a studio member can read their own workspace client', async () => {
    const { data, error } = await wsA.client.from('clients').select('id').eq('id', wsA.clientId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('a studio member cannot read another workspace\'s clients', async () => {
    const { data, error } = await wsA.client.from('clients').select('id').eq('studio_id', wsB.studioId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('a studio member cannot read another workspace\'s subscription', async () => {
    const { data, error } = await wsA.client.from('subscriptions').select('id').eq('studio_id', wsB.studioId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('a studio member cannot read another workspace\'s membership roster', async () => {
    const { data, error } = await wsA.client.from('studio_members').select('id').eq('studio_id', wsB.studioId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('a studio member cannot update another workspace\'s client', async () => {
    await wsA.client.from('clients').update({ status: 'archived' }).eq('id', wsB.clientId)

    const { data: actual } = await admin.from('clients').select('status').eq('id', wsB.clientId).single()
    expect(actual?.status).toBe('lead') // unchanged - the cross-workspace write did not apply
  })

  it('an unauthenticated visitor cannot read any workspace\'s membership roster', async () => {
    const { data, error } = await anon.from('studio_members').select('id').eq('studio_id', wsA.studioId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('an unauthenticated visitor cannot read any workspace\'s subscription or payments', async () => {
    const [subs, payments] = await Promise.all([
      anon.from('subscriptions').select('id').eq('studio_id', wsA.studioId),
      anon.from('payments').select('id').eq('studio_id', wsA.studioId),
    ])
    expect(subs.data).toEqual([])
    expect(payments.data).toEqual([])
  })

  it('an unauthenticated visitor cannot insert themselves as a workspace collaborator', async () => {
    const { error } = await anon.from('studio_members').insert({
      studio_id: wsA.studioId,
      user_id: wsB.userId,
      role: 'team_member',
      status: 'active',
    })
    expect(error).not.toBeNull()
  })
})

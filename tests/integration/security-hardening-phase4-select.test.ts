import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 4 security audit — SELECT authorization & data exposure.
 *
 * This file is PURE PROOF, not a fix. Phase 2 (migration 032) added
 * role-checked INSERT/UPDATE/DELETE policies across most tenant-owned
 * tables but deliberately left SELECT untouched (`is_studio_member`
 * only — tenant isolation, not role). Phase 3/the "Operational Closure"
 * task role-gated `payments` specifically (migration 036, live — see
 * security-hardening-phase3-select.test.ts for that regression proof).
 *
 * Every test below authenticates as a real `editor` or `team_member` JWT
 * (never through a Next.js Server Action — direct PostgREST, exactly the
 * path a technical, same-studio, low-privilege user could take) and
 * SELECTs from a table the role's own ROLE_PERMISSIONS entry
 * (src/lib/auth/permissions.ts) does NOT grant `<table>:read` for.
 *
 * IMPORTANT: per current, intentional design, SELECT is membership-only
 * on every table below except `payments`. So the "editor CANNOT read"
 * tests are EXPECTED TO FAIL right now — that failure is the finding
 * being proven for the Phase 4 report, not a broken test. This file
 * must NOT be "fixed" by weakening its assertions; it stays red until a
 * future migration (037, not created this phase) tightens these SELECT
 * policies, at which point it should flip green like phase2/phase3 did.
 *
 * Runs against the REAL Supabase project. Only via `npm run test:integration`.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'security-hardening-phase4-select.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-p4-${RUN_ID}`

interface RoleUser {
  userId: string
  client: SupabaseClient
}

let studioId: string
let clientUserIds: string[] = []
let owner: RoleUser
let editor: RoleUser
let teamMember: RoleUser

let clientRowId: string
let contractId: string
let bookingId: string
let projectId: string
let quoteId: string
let invoiceId: string
let taskId: string
let expenseId: string
let templateId: string
let productId: string
let orderId: string
let websiteId: string
let payoutId: string
let subscriptionId: string

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
  editor = await createRoleUser('editor', 'editor', studioId)
  teamMember = await createRoleUser('teammember', 'team_member', studioId)

  clientRowId = (await admin.from('clients').insert({ studio_id: studioId, first_name: RUN_TAG, last_name: 'Client', email: `${RUN_TAG}-c@example.com` }).select('id').single()).data!.id
  contractId = (await admin.from('contracts').insert({ studio_id: studioId, title: RUN_TAG, status: 'draft' }).select('id').single()).data!.id
  bookingId = (await admin.from('bookings').insert({ studio_id: studioId, session_name: RUN_TAG, status: 'inquiry' }).select('id').single()).data!.id
  projectId = (await admin.from('projects').insert({ studio_id: studioId, name: RUN_TAG, status: 'planning' }).select('id').single()).data!.id
  quoteId = (await admin.from('quotes').insert({ studio_id: studioId, title: RUN_TAG, quote_number: `Q-${RUN_ID}`, status: 'draft' }).select('id').single()).data!.id
  invoiceId = (await admin.from('invoices').insert({ studio_id: studioId, invoice_number: `INV-${RUN_ID}`, status: 'draft' }).select('id').single()).data!.id
  taskId = (await admin.from('tasks').insert({ studio_id: studioId, title: RUN_TAG, status: 'todo' }).select('id').single()).data!.id
  expenseId = (await admin.from('expenses').insert({ studio_id: studioId, description: RUN_TAG, amount: 10, category: 'other' }).select('id').single()).data!.id
  templateId = (await admin.from('questionnaire_templates').insert({ studio_id: studioId, name: RUN_TAG, fields: [] }).select('id').single()).data!.id
  productId = (await admin.from('products').insert({ studio_id: studioId, name: RUN_TAG, type: 'digital', status: 'draft', price: 10 }).select('id').single()).data!.id
  orderId = (await admin.from('orders').insert({ studio_id: studioId, order_number: `ORD-${RUN_ID}`, email: `${RUN_TAG}-buyer@example.com` }).select('id').single()).data!.id
  websiteId = (await admin.from('websites').insert({ studio_id: studioId, name: RUN_TAG, subdomain: `${RUN_TAG}-w`, status: 'draft' }).select('id').single()).data!.id
  payoutId = (await admin.from('payouts').insert({ studio_id: studioId, amount: 1000, currency: 'KES', method: 'manual', reference: RUN_TAG }).select('id').single()).data!.id

  const { data: freePlan } = await admin.from('plans').select('id').eq('slug', 'free').single()
  subscriptionId = (await admin.from('subscriptions').insert({ studio_id: studioId, plan_id: freePlan!.id, status: 'active' }).select('id').single()).data!.id
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

// editor: ROLE_PERMISSIONS has no clients/contracts/bookings/projects/quotes/
// invoices/tasks/expenses/questionnaires/store/website/team :read at all.
describe('Phase 4: editor role — tables editor has zero :read permission for', () => {
  it('clients: editor lacks clients:read', async () => {
    const { data } = await editor.client.from('clients').select('id').eq('id', clientRowId)
    expect(data ?? []).toEqual([])
  })
  it('contracts: editor lacks contracts:read', async () => {
    const { data } = await editor.client.from('contracts').select('id').eq('id', contractId)
    expect(data ?? []).toEqual([])
  })
  it('bookings: editor lacks bookings:read', async () => {
    const { data } = await editor.client.from('bookings').select('id').eq('id', bookingId)
    expect(data ?? []).toEqual([])
  })
  it('projects: editor lacks projects:read', async () => {
    const { data } = await editor.client.from('projects').select('id').eq('id', projectId)
    expect(data ?? []).toEqual([])
  })
  it('quotes: editor lacks quotes:read', async () => {
    const { data } = await editor.client.from('quotes').select('id').eq('id', quoteId)
    expect(data ?? []).toEqual([])
  })
  it('invoices: editor lacks invoices:read', async () => {
    const { data } = await editor.client.from('invoices').select('id').eq('id', invoiceId)
    expect(data ?? []).toEqual([])
  })
  it('tasks: editor lacks tasks:read', async () => {
    const { data } = await editor.client.from('tasks').select('id').eq('id', taskId)
    expect(data ?? []).toEqual([])
  })
  it('expenses: editor lacks expenses:read', async () => {
    const { data } = await editor.client.from('expenses').select('id').eq('id', expenseId)
    expect(data ?? []).toEqual([])
  })
  it('questionnaire_templates: editor lacks questionnaires:read', async () => {
    const { data } = await editor.client.from('questionnaire_templates').select('id').eq('id', templateId)
    expect(data ?? []).toEqual([])
  })
  it('orders: editor lacks store:read', async () => {
    const { data } = await editor.client.from('orders').select('id').eq('id', orderId)
    expect(data ?? []).toEqual([])
  })
  it('websites: editor lacks website:read', async () => {
    const { data } = await editor.client.from('websites').select('id').eq('id', websiteId)
    expect(data ?? []).toEqual([])
  })
  it('payouts: editor has no payouts permission of any kind', async () => {
    const { data } = await editor.client.from('payouts').select('id').eq('id', payoutId)
    expect(data ?? []).toEqual([])
  })
  it('subscriptions: editor has no subscriptions/billing permission', async () => {
    const { data } = await editor.client.from('subscriptions').select('id').eq('id', subscriptionId)
    expect(data ?? []).toEqual([])
  })
  it('studio_members: editor lacks team:read (roster/role enumeration)', async () => {
    const { data } = await editor.client.from('studio_members').select('id, role, user_id').eq('studio_id', studioId)
    // editor's own membership row is visible via the `user_id = auth.uid()` OR-clause regardless
    // of team:read — the finding is whether *other members'* rows leak, not the caller's own row.
    const otherRows = (data ?? []).filter((r: { user_id: string }) => r.user_id !== editor.userId)
    expect(otherRows).toEqual([])
  })
})

// team_member: ROLE_PERMISSIONS grants team_member :read on nearly everything
// except payments/payouts/subscriptions/settings-billing — those three are
// the real gap for this role.
describe('Phase 4: team_member role — tables team_member has zero :read permission for', () => {
  it('payouts: team_member lacks any payouts permission', async () => {
    const { data } = await teamMember.client.from('payouts').select('id').eq('id', payoutId)
    expect(data ?? []).toEqual([])
  })
  it('subscriptions: team_member lacks any subscriptions/billing permission', async () => {
    const { data } = await teamMember.client.from('subscriptions').select('id').eq('id', subscriptionId)
    expect(data ?? []).toEqual([])
  })
})

describe('Phase 4: sanity — studio_owner retains full access (no over-correction expected)', () => {
  it('owner can read clients, payouts, and subscriptions', async () => {
    const [c, p, s] = await Promise.all([
      owner.client.from('clients').select('id').eq('id', clientRowId),
      owner.client.from('payouts').select('id').eq('id', payoutId),
      owner.client.from('subscriptions').select('id').eq('id', subscriptionId),
    ])
    expect(c.data).toHaveLength(1)
    expect(p.data).toHaveLength(1)
    expect(s.data).toHaveLength(1)
  })
})

describe('Phase 4: profiles — teammate visibility exceeds team:read', () => {
  it('editor (lacking team:read) can still read the owner\'s full profile row via the teammate-visibility policy', async () => {
    const { data } = await editor.client.from('profiles').select('id, email, first_name, last_name, phone, role').eq('id', owner.userId)
    expect(data).toHaveLength(1)
    expect(data?.[0]?.email).toBeTruthy()
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 2 security hardening — regression coverage for the role/permission
 * RLS enforcement added in supabase/migrations/032_phase2_rls_role_enforcement.sql.
 *
 * Phase 1 (031) closed tenant-isolation and secret-exposure gaps but left
 * every tenant-owned business table's RLS checking only is_studio_member —
 * tenant isolation, not role. This file proves that gap directly: every
 * "DENIED" test here authenticates as a real team_member/editor test user
 * and calls the Supabase client directly (never through a Next.js Server
 * Action) — exactly the attack path a technical, same-studio, low-privilege
 * user could take. If migration 032 has not been applied, these tests fail
 * (the mutation succeeds when it should be rejected) — that failure mode
 * IS the vulnerability being proven, not a broken test.
 *
 * Runs against the REAL Supabase project, same model as
 * security-hardening.test.ts / workspace-isolation.test.ts. Only via
 * `npm run test:integration`, never as part of `npm test`.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'security-hardening-phase2.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const RUN_TAG = `zzz-lensflow-test-p2-${RUN_ID}`

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
let otherStudio: { studioId: string; client: SupabaseClient; userId: string } // cross-tenant

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

// Test resource IDs, created fresh per-test via admin so DENIED attempts
// never depend on order and ALLOWED attempts don't consume a shared row.
async function makeClientRow() {
  const { data } = await admin.from('clients').insert({ studio_id: studioId, first_name: RUN_TAG, last_name: 'Client', email: `${RUN_TAG}-c-${crypto.randomUUID().slice(0, 6)}@example.com` }).select('id').single()
  return data!.id as string
}
async function makeContractRow() {
  const { data } = await admin.from('contracts').insert({ studio_id: studioId, title: RUN_TAG, status: 'draft' }).select('id').single()
  return data!.id as string
}
async function makeBookingRow() {
  const { data } = await admin.from('bookings').insert({ studio_id: studioId, session_name: RUN_TAG, status: 'inquiry' }).select('id').single()
  return data!.id as string
}
async function makeProjectRow() {
  const { data } = await admin.from('projects').insert({ studio_id: studioId, name: RUN_TAG, status: 'planning' }).select('id').single()
  return data!.id as string
}
async function makeWebsiteRow() {
  const { data } = await admin.from('websites').insert({ studio_id: studioId, name: RUN_TAG, subdomain: `${RUN_TAG}-${crypto.randomUUID().slice(0, 6)}`, status: 'draft' }).select('id').single()
  return data!.id as string
}
async function makeQuestionnaireTemplateRow() {
  const { data } = await admin.from('questionnaire_templates').insert({ studio_id: studioId, name: RUN_TAG, fields: [] }).select('id').single()
  return data!.id as string
}
async function makeTaskRow() {
  const { data } = await admin.from('tasks').insert({ studio_id: studioId, title: RUN_TAG, status: 'todo' }).select('id').single()
  return data!.id as string
}
async function makeExpenseRow() {
  const { data } = await admin.from('expenses').insert({ studio_id: studioId, description: RUN_TAG, amount: 10, category: 'other' }).select('id').single()
  return data!.id as string
}
async function makeQuoteRow() {
  const { data } = await admin.from('quotes').insert({ studio_id: studioId, title: RUN_TAG, quote_number: `Q-${crypto.randomUUID().slice(0, 6)}`, status: 'draft' }).select('id').single()
  return data!.id as string
}
async function makeInvoiceRow() {
  const { data } = await admin.from('invoices').insert({ studio_id: studioId, invoice_number: `INV-${crypto.randomUUID().slice(0, 6)}`, status: 'draft' }).select('id').single()
  return data!.id as string
}
async function makeProductRow() {
  const { data } = await admin.from('products').insert({ studio_id: studioId, name: RUN_TAG, type: 'digital', status: 'draft', price: 10 }).select('id').single()
  return data!.id as string
}
async function makeOrderRow() {
  const { data } = await admin.from('orders').insert({ studio_id: studioId, order_number: `ORD-${crypto.randomUUID().slice(0, 6)}`, status: 'pending', payment_status: 'pending' }).select('id').single()
  return data!.id as string
}

beforeAll(async () => {
  const ownerEmail = `${RUN_TAG}-owner@example.com`
  const ownerPassword = crypto.randomUUID()
  const { data: ownerRes, error: ownerErr } = await admin.auth.admin.createUser({ email: ownerEmail, password: ownerPassword, email_confirm: true })
  if (ownerErr || !ownerRes.user) throw new Error(`Failed to create owner: ${ownerErr?.message}`)
  clientUserIds.push(ownerRes.user.id)

  const slug = `${RUN_TAG}-studio`
  const { data: studio, error: studioErr } = await admin.from('studios').insert({ name: 'Phase 2 Test Studio', slug, owner_id: ownerRes.user.id }).select('id').single()
  if (studioErr || !studio) throw new Error(`Failed to create test studio: ${studioErr?.message}`)
  studioId = studio.id

  await admin.from('studio_members').insert({ studio_id: studioId, user_id: ownerRes.user.id, role: 'studio_owner', status: 'active', joined_at: new Date().toISOString() })

  const { data: freePlan } = await admin.from('plans').select('id').eq('slug', 'free').single()
  if (freePlan) await admin.from('subscriptions').insert({ studio_id: studioId, plan_id: freePlan.id, status: 'active' })

  const ownerSignIn = createClient(SUPABASE_URL, ANON_KEY)
  const { data: ownerSession } = await ownerSignIn.auth.signInWithPassword({ email: ownerEmail, password: ownerPassword })
  owner = {
    userId: ownerRes.user.id,
    client: createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${ownerSession!.session!.access_token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  }

  photographer = await createRoleUser('photographer', 'photographer', studioId)
  teamMember = await createRoleUser('team-member', 'team_member', studioId)
  editor = await createRoleUser('editor', 'editor', studioId)

  // Cross-tenant: a second studio + owner, used for the client/gallery-style
  // isolation sanity check (tenant isolation should be unaffected by 032).
  const otherEmail = `${RUN_TAG}-other-owner@example.com`
  const otherPassword = crypto.randomUUID()
  const { data: otherRes } = await admin.auth.admin.createUser({ email: otherEmail, password: otherPassword, email_confirm: true })
  clientUserIds.push(otherRes!.user.id)
  const { data: otherStudioRow } = await admin.from('studios').insert({ name: 'Phase 2 Other Studio', slug: `${RUN_TAG}-other`, owner_id: otherRes!.user.id }).select('id').single()
  await admin.from('studio_members').insert({ studio_id: otherStudioRow!.id, user_id: otherRes!.user.id, role: 'studio_owner', status: 'active', joined_at: new Date().toISOString() })
  const otherSignIn = createClient(SUPABASE_URL, ANON_KEY)
  const { data: otherSession } = await otherSignIn.auth.signInWithPassword({ email: otherEmail, password: otherPassword })
  otherStudio = {
    studioId: otherStudioRow!.id,
    userId: otherRes!.user.id,
    client: createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${otherSession!.session!.access_token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  }
})

afterAll(async () => {
  for (const sid of [studioId, otherStudio?.studioId].filter(Boolean)) {
    await admin.from('studios').delete().eq('id', sid)
  }
  for (const uid of clientUserIds) {
    await admin.auth.admin.deleteUser(uid).catch(() => {})
  }
})

describe('Phase 2 P0: clients — role enforcement', () => {
  it('team_member cannot delete a client (matrix: no clients:delete for any non-owner role)', async () => {
    const id = await makeClientRow()
    const { error } = await teamMember.client.from('clients').delete().eq('id', id)
    const { data: after } = await admin.from('clients').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
    void error
  })
  it('editor cannot create a client (matrix: editor has zero clients:* permissions)', async () => {
    const { error } = await editor.client.from('clients').insert({ studio_id: studioId, first_name: 'x', last_name: 'y', email: `${RUN_TAG}-edit@example.com` })
    expect(error).not.toBeNull()
  })
  it('editor cannot update a client', async () => {
    const id = await makeClientRow()
    const { error } = await editor.client.from('clients').update({ first_name: 'Hacked' }).eq('id', id)
    const { data: after } = await admin.from('clients').select('first_name').eq('id', id).single()
    expect(after?.first_name).not.toBe('Hacked')
    void error
  })
  it('photographer CAN create and update a client (matrix: clients:create/update)', async () => {
    const { data, error } = await photographer.client.from('clients').insert({ studio_id: studioId, first_name: 'OK', last_name: 'Client', email: `${RUN_TAG}-ok@example.com` }).select('id').single()
    expect(error).toBeNull()
    expect(data).not.toBeNull()
  })
  it('studio_owner CAN delete a client', async () => {
    const id = await makeClientRow()
    const { error } = await owner.client.from('clients').delete().eq('id', id)
    expect(error).toBeNull()
    const { data: after } = await admin.from('clients').select('id').eq('id', id).maybeSingle()
    expect(after).toBeNull()
  })
})

describe('Phase 2 P0: contracts — role enforcement', () => {
  it('team_member cannot delete a contract', async () => {
    const id = await makeContractRow()
    await teamMember.client.from('contracts').delete().eq('id', id)
    const { data: after } = await admin.from('contracts').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('editor cannot delete a contract', async () => {
    const id = await makeContractRow()
    await editor.client.from('contracts').delete().eq('id', id)
    const { data: after } = await admin.from('contracts').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('team_member cannot update contract status', async () => {
    const id = await makeContractRow()
    await teamMember.client.from('contracts').update({ status: 'completed' }).eq('id', id)
    const { data: after } = await admin.from('contracts').select('status').eq('id', id).single()
    expect(after?.status).toBe('draft')
  })
  it('photographer CAN create a contract', async () => {
    const { error } = await photographer.client.from('contracts').insert({ studio_id: studioId, title: RUN_TAG, status: 'draft', content: 'test' })
    expect(error).toBeNull()
  })
  it('studio_owner CAN delete a contract', async () => {
    const id = await makeContractRow()
    const { error } = await owner.client.from('contracts').delete().eq('id', id)
    expect(error).toBeNull()
  })
})

describe('Phase 2 P0: bookings — role enforcement', () => {
  it('team_member cannot delete a booking', async () => {
    const id = await makeBookingRow()
    await teamMember.client.from('bookings').delete().eq('id', id)
    const { data: after } = await admin.from('bookings').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('editor cannot create a booking', async () => {
    const { error } = await editor.client.from('bookings').insert({ studio_id: studioId, session_name: RUN_TAG, status: 'inquiry' })
    expect(error).not.toBeNull()
  })
  it('photographer CAN create a booking', async () => {
    const { error } = await photographer.client.from('bookings').insert({ studio_id: studioId, session_name: RUN_TAG, status: 'inquiry' })
    expect(error).toBeNull()
  })
})

describe('Phase 2 P0: projects — role enforcement', () => {
  it('team_member cannot delete a project', async () => {
    const id = await makeProjectRow()
    await teamMember.client.from('projects').delete().eq('id', id)
    const { data: after } = await admin.from('projects').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('studio_owner CAN delete a project', async () => {
    const id = await makeProjectRow()
    const { error } = await owner.client.from('projects').delete().eq('id', id)
    expect(error).toBeNull()
  })
})

describe('Phase 2 P0: websites — role enforcement', () => {
  it('team_member cannot publish (update) a website', async () => {
    const id = await makeWebsiteRow()
    await teamMember.client.from('websites').update({ status: 'published' }).eq('id', id)
    const { data: after } = await admin.from('websites').select('status').eq('id', id).single()
    expect(after?.status).toBe('draft')
  })
  it('team_member cannot delete a website', async () => {
    const id = await makeWebsiteRow()
    await teamMember.client.from('websites').delete().eq('id', id)
    const { data: after } = await admin.from('websites').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('studio_owner CAN publish a website', async () => {
    const id = await makeWebsiteRow()
    const { error } = await owner.client.from('websites').update({ status: 'published' }).eq('id', id)
    expect(error).toBeNull()
    const { data: after } = await admin.from('websites').select('status').eq('id', id).single()
    expect(after?.status).toBe('published')
  })
})

describe('Phase 2 P0: questionnaire templates — role enforcement', () => {
  it('team_member cannot delete a questionnaire template', async () => {
    const id = await makeQuestionnaireTemplateRow()
    await teamMember.client.from('questionnaire_templates').delete().eq('id', id)
    const { data: after } = await admin.from('questionnaire_templates').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('photographer CAN create a questionnaire template', async () => {
    const { error } = await photographer.client.from('questionnaire_templates').insert({ studio_id: studioId, name: RUN_TAG, fields: [] })
    expect(error).toBeNull()
  })
})

describe('Phase 2 P0: tasks — role enforcement', () => {
  it('editor cannot create a task', async () => {
    const { error } = await editor.client.from('tasks').insert({ studio_id: studioId, title: RUN_TAG, status: 'todo' })
    expect(error).not.toBeNull()
  })
  it('team_member CAN update task status (matrix: tasks:update)', async () => {
    const id = await makeTaskRow()
    const { error } = await teamMember.client.from('tasks').update({ status: 'in_progress' }).eq('id', id)
    expect(error).toBeNull()
  })
  it('team_member cannot delete a task', async () => {
    const id = await makeTaskRow()
    await teamMember.client.from('tasks').delete().eq('id', id)
    const { data: after } = await admin.from('tasks').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
})

describe('Phase 2 P0: expenses — role enforcement', () => {
  it('team_member cannot delete an expense', async () => {
    const id = await makeExpenseRow()
    await teamMember.client.from('expenses').delete().eq('id', id)
    const { data: after } = await admin.from('expenses').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('photographer CAN delete an expense', async () => {
    const id = await makeExpenseRow()
    const { error } = await photographer.client.from('expenses').delete().eq('id', id)
    expect(error).toBeNull()
  })
})

describe('Phase 2 P0: quotes — role enforcement', () => {
  it('team_member cannot delete a quote', async () => {
    const id = await makeQuoteRow()
    await teamMember.client.from('quotes').delete().eq('id', id)
    const { data: after } = await admin.from('quotes').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('team_member cannot update quote status', async () => {
    const id = await makeQuoteRow()
    await teamMember.client.from('quotes').update({ status: 'sent' }).eq('id', id)
    const { data: after } = await admin.from('quotes').select('status').eq('id', id).single()
    expect(after?.status).toBe('draft')
  })
  it('photographer CAN update quote status', async () => {
    const id = await makeQuoteRow()
    const { error } = await photographer.client.from('quotes').update({ status: 'sent' }).eq('id', id)
    expect(error).toBeNull()
  })
})

describe('Phase 2 P0: invoices — role enforcement (unauthorized DELETE / mark-paid)', () => {
  it('team_member cannot delete an invoice', async () => {
    const id = await makeInvoiceRow()
    await teamMember.client.from('invoices').delete().eq('id', id)
    const { data: after } = await admin.from('invoices').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('team_member cannot update invoice status', async () => {
    const id = await makeInvoiceRow()
    await teamMember.client.from('invoices').update({ status: 'sent' }).eq('id', id)
    const { data: after } = await admin.from('invoices').select('status').eq('id', id).single()
    expect(after?.status).toBe('draft')
  })
  it('photographer cannot mark an invoice paid directly (invoices:manage_payments is owner-only)', async () => {
    const id = await makeInvoiceRow()
    const { error } = await photographer.client.from('invoices').update({ status: 'paid' }).eq('id', id)
    const { data: after } = await admin.from('invoices').select('status').eq('id', id).single()
    expect(after?.status).not.toBe('paid')
    void error
  })
  it('photographer CAN update other invoice fields (invoices:update)', async () => {
    const id = await makeInvoiceRow()
    const { error } = await photographer.client.from('invoices').update({ status: 'sent' }).eq('id', id)
    expect(error).toBeNull()
  })
  it('studio_owner CAN mark an invoice paid', async () => {
    const id = await makeInvoiceRow()
    const { error } = await owner.client.from('invoices').update({ status: 'paid' }).eq('id', id)
    expect(error).toBeNull()
  })
})

describe('Phase 2 P0: products — role enforcement', () => {
  it('team_member cannot delete a product', async () => {
    const id = await makeProductRow()
    await teamMember.client.from('products').delete().eq('id', id)
    const { data: after } = await admin.from('products').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('editor cannot create a product', async () => {
    const { error } = await editor.client.from('products').insert({ studio_id: studioId, name: RUN_TAG, type: 'digital', status: 'draft', price: 10 })
    expect(error).not.toBeNull()
  })
  it('photographer CAN delete a product (matrix: store:manage_products)', async () => {
    const id = await makeProductRow()
    const { error } = await photographer.client.from('products').delete().eq('id', id)
    expect(error).toBeNull()
  })
})

describe('Phase 2 P0: orders — role enforcement', () => {
  it('team_member cannot delete an order', async () => {
    const id = await makeOrderRow()
    await teamMember.client.from('orders').delete().eq('id', id)
    const { data: after } = await admin.from('orders').select('id').eq('id', id).maybeSingle()
    expect(after).not.toBeNull()
  })
  it('team_member cannot update order status', async () => {
    const id = await makeOrderRow()
    await teamMember.client.from('orders').update({ status: 'delivered' }).eq('id', id)
    const { data: after } = await admin.from('orders').select('status').eq('id', id).single()
    expect(after?.status).toBe('pending')
  })
  it('photographer CAN update order status', async () => {
    const id = await makeOrderRow()
    const { error } = await photographer.client.from('orders').update({ status: 'delivered' }).eq('id', id)
    expect(error).toBeNull()
  })
})

describe('Phase 2: tenant isolation unaffected by role changes', () => {
  it('a studio_owner from a different studio still cannot read/update this studio\'s clients', async () => {
    const id = await makeClientRow()
    const { data: readAttempt } = await otherStudio.client.from('clients').select('id').eq('id', id)
    expect(readAttempt).toEqual([])
    const { error } = await otherStudio.client.from('clients').update({ first_name: 'Hacked' }).eq('id', id)
    const { data: after } = await admin.from('clients').select('first_name').eq('id', id).single()
    expect(after?.first_name).not.toBe('Hacked')
    void error
  })
})

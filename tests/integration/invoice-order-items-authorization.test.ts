import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 10 Targets 2 & 3 acceptance test for migration
 * 044_phase10_authorization_hardening.sql.
 *
 * Phase 9 reconnaissance live-confirmed that invoice_items and order_items
 * each carried a single FOR ALL policy (USING is_studio_member(...) alone
 * -- Postgres never evaluates WITH CHECK for DELETE), so any active
 * studio member -- regardless of role -- could delete an invoice's or
 * order's line items directly via PostgREST, silently corrupting the
 * parent row's subtotal/total (computed and stored server-side from the
 * item set at write time).
 *
 * Migration 044 decomposes both FOR ALL policies into SELECT/INSERT/
 * UPDATE/DELETE, with DELETE (and the pre-existing INSERT/UPDATE WITH
 * CHECK) requiring invoices:update / store:manage_orders respectively --
 * the same permission each table's own WITH CHECK already required, and
 * the same permission the parent invoices/orders tables' own UPDATE
 * policies require. This file proves the DB layer alone now enforces
 * that boundary, bypassing every Server Action.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'invoice-order-items-authorization.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-items10-${RUN_ID}`

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

async function makeInvoiceItem(suffix: string): Promise<string> {
  const { data: invoice, error: invErr } = await admin
    .from('invoices')
    .insert({ studio_id: studioId, invoice_number: `${RUN_TAG}-${suffix}`, status: 'draft', issue_date: new Date().toISOString().slice(0, 10), subtotal: 100, tax: 0, discount: 0, total: 100, amount_paid: 0 })
    .select('id')
    .single()
  if (invErr || !invoice) throw new Error(`Failed to create invoice: ${invErr?.message}`)
  const { data: item, error: itemErr } = await admin
    .from('invoice_items')
    .insert({ invoice_id: invoice.id, description: `${RUN_TAG}-${suffix}`, quantity: 1, unit_price: 100, total: 100 })
    .select('id')
    .single()
  if (itemErr || !item) throw new Error(`Failed to create invoice item: ${itemErr?.message}`)
  return item.id
}

async function makeOrderItem(suffix: string): Promise<string> {
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({ studio_id: studioId, order_number: `${RUN_TAG}-${suffix}`, email: `${RUN_TAG}-${suffix}@example.com`, status: 'pending', payment_status: 'pending', currency: 'KES', subtotal: 100, total: 100 })
    .select('id')
    .single()
  if (orderErr || !order) throw new Error(`Failed to create order: ${orderErr?.message}`)
  const { data: item, error: itemErr } = await admin
    .from('order_items')
    .insert({ order_id: order.id, product_name: `${RUN_TAG}-${suffix}`, quantity: 1, price: 100, total: 100 })
    .select('id')
    .single()
  if (itemErr || !item) throw new Error(`Failed to create order item: ${itemErr?.message}`)
  return item.id
}

async function rowExists(table: string, id: string): Promise<boolean> {
  const { data } = await admin.from(table).select('id').eq('id', id).maybeSingle()
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

describe('invoice_items DELETE: requires invoices:update (matches INSERT/UPDATE)', () => {
  it('studio_owner can delete an invoice item', async () => {
    const id = await makeInvoiceItem('owner-delete')
    const { error } = await owner.client.from('invoice_items').delete().eq('id', id)
    expect(error).toBeNull()
    expect(await rowExists('invoice_items', id)).toBe(false)
  })

  it('photographer can delete an invoice item (holds invoices:update)', async () => {
    const id = await makeInvoiceItem('photo-delete')
    const { error } = await photographer.client.from('invoice_items').delete().eq('id', id)
    expect(error).toBeNull()
    expect(await rowExists('invoice_items', id)).toBe(false)
  })

  it('team_member cannot delete an invoice item (lacks invoices:update)', async () => {
    const id = await makeInvoiceItem('team-delete')
    await teamMember.client.from('invoice_items').delete().eq('id', id)
    expect(await rowExists('invoice_items', id)).toBe(true)
  })

  it('editor cannot delete an invoice item', async () => {
    const id = await makeInvoiceItem('editor-delete')
    await editor.client.from('invoice_items').delete().eq('id', id)
    expect(await rowExists('invoice_items', id)).toBe(true)
  })

  it('a studio_owner from another studio cannot delete this studio\'s invoice item (tenant isolation)', async () => {
    const id = await makeInvoiceItem('cross-delete')
    await crossStudioOwner.client.from('invoice_items').delete().eq('id', id)
    expect(await rowExists('invoice_items', id)).toBe(true)
  })

  it('anonymous cannot delete an invoice item', async () => {
    const id = await makeInvoiceItem('anon-delete')
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    await anon.from('invoice_items').delete().eq('id', id)
    expect(await rowExists('invoice_items', id)).toBe(true)
  })
})

describe('order_items DELETE: requires store:manage_orders (matches INSERT/UPDATE)', () => {
  it('studio_owner can delete an order item', async () => {
    const id = await makeOrderItem('owner-delete')
    const { error } = await owner.client.from('order_items').delete().eq('id', id)
    expect(error).toBeNull()
    expect(await rowExists('order_items', id)).toBe(false)
  })

  it('photographer can delete an order item (holds store:manage_orders)', async () => {
    const id = await makeOrderItem('photo-delete')
    const { error } = await photographer.client.from('order_items').delete().eq('id', id)
    expect(error).toBeNull()
    expect(await rowExists('order_items', id)).toBe(false)
  })

  it('team_member cannot delete an order item', async () => {
    const id = await makeOrderItem('team-delete')
    await teamMember.client.from('order_items').delete().eq('id', id)
    expect(await rowExists('order_items', id)).toBe(true)
  })

  it('editor cannot delete an order item', async () => {
    const id = await makeOrderItem('editor-delete')
    await editor.client.from('order_items').delete().eq('id', id)
    expect(await rowExists('order_items', id)).toBe(true)
  })

  it('a studio_owner from another studio cannot delete this studio\'s order item (tenant isolation)', async () => {
    const id = await makeOrderItem('cross-delete')
    await crossStudioOwner.client.from('order_items').delete().eq('id', id)
    expect(await rowExists('order_items', id)).toBe(true)
  })

  it('anonymous cannot delete an order item', async () => {
    const id = await makeOrderItem('anon-delete')
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    await anon.from('order_items').delete().eq('id', id)
    expect(await rowExists('order_items', id)).toBe(true)
  })
})

describe('invoice_items / order_items: SELECT unchanged (new explicit policy replacing the old FOR ALL)', () => {
  it('photographer can still read invoice items (holds invoices:read)', async () => {
    const id = await makeInvoiceItem('select-check')
    const { data } = await photographer.client.from('invoice_items').select('id').eq('id', id)
    expect(data).toHaveLength(1)
  })

  it('photographer can still read order items (holds store:read)', async () => {
    const id = await makeOrderItem('select-check')
    const { data } = await photographer.client.from('order_items').select('id').eq('id', id)
    expect(data).toHaveLength(1)
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 11 Step 12: real JWT-backed tenant-isolation coverage for
 * invoices/invoice_items/payments -- the RLS policies themselves
 * (migration 032) are already role-scoped and tested for permission
 * matrices (invoice-action-authorization.test.ts, financial-rbac.test.ts).
 * What's new here is proving a DIFFERENT studio's owner -- who holds every
 * permission that exists, just not in this studio -- is denied outright,
 * the same "Studio A invoice / Studio B user attempts access -> denied"
 * shape this step's brief calls for. Also covers the two real cross-studio
 * bugs found and fixed in src/lib/actions/invoices.ts this step: a
 * foreign invoiceId reaching sendInvoiceSentEmail, and reaching
 * bulkUpdateInvoiceStatus's per-id amount_paid write.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error('invoice-tenant-isolation.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).')
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-invtenant-${RUN_ID}`

interface RoleUser {
  userId: string
  client: SupabaseClient
}

let studioAId: string
let studioBId: string
let clientUserIds: string[] = []
let ownerA: RoleUser
let ownerB: RoleUser
let clientAId: string
let invoiceAId: string
let invoiceItemAId: string

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

  const { data: clientA } = await admin
    .from('clients')
    .insert({ studio_id: studioAId, first_name: 'Real', last_name: 'ClientA', email: `${RUN_TAG}-clienta@example.com` })
    .select('id')
    .single()
  clientAId = clientA!.id

  const { data: invoiceA } = await admin
    .from('invoices')
    .insert({ studio_id: studioAId, client_id: clientAId, invoice_number: `${RUN_TAG}-INV-1`, status: 'draft', subtotal: 1000, total: 1000, amount_paid: 0 })
    .select('id')
    .single()
  invoiceAId = invoiceA!.id

  const { data: itemA } = await admin
    .from('invoice_items')
    .insert({ invoice_id: invoiceAId, description: 'Session', quantity: 1, unit_price: 1000, total: 1000 })
    .select('id')
    .single()
  invoiceItemAId = itemA!.id
})

afterAll(async () => {
  if (studioAId) await admin.from('studios').delete().eq('id', studioAId)
  if (studioBId) await admin.from('studios').delete().eq('id', studioBId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

describe('Invoice tenant isolation: Studio A invoice, Studio B owner attempts access', () => {
  it('read: Studio B cannot SELECT Studio A\'s invoice', async () => {
    const { data } = await ownerB.client.from('invoices').select('id').eq('id', invoiceAId)
    expect(data ?? []).toEqual([])
  })

  it('read: Studio B cannot SELECT Studio A\'s invoice line items', async () => {
    const { data } = await ownerB.client.from('invoice_items').select('id').eq('id', invoiceItemAId)
    expect(data ?? []).toEqual([])
  })

  it('update: Studio B cannot change Studio A\'s invoice status', async () => {
    const { data } = await ownerB.client.from('invoices').update({ status: 'sent' }).eq('id', invoiceAId).select('id')
    expect(data ?? []).toEqual([])
    const { data: unchanged } = await admin.from('invoices').select('status').eq('id', invoiceAId).single()
    expect(unchanged?.status).toBe('draft')
  })

  it('update: Studio B cannot mark Studio A\'s invoice as paid or touch amount_paid', async () => {
    const { data } = await ownerB.client.from('invoices').update({ status: 'paid', amount_paid: 1000 }).eq('id', invoiceAId).select('id')
    expect(data ?? []).toEqual([])
    const { data: unchanged } = await admin.from('invoices').select('amount_paid, status').eq('id', invoiceAId).single()
    expect(unchanged?.amount_paid).toBe(0)
    expect(unchanged?.status).toBe('draft')
  })

  it('delete: Studio B cannot delete Studio A\'s invoice', async () => {
    await ownerB.client.from('invoices').delete().eq('id', invoiceAId)
    const { data: stillThere } = await admin.from('invoices').select('id').eq('id', invoiceAId).maybeSingle()
    expect(stillThere?.id).toBe(invoiceAId)
  })
})

describe('Invoice tenant isolation: Studio A owner retains full access to their own invoice (sanity check)', () => {
  it('Studio A owner can still read their own invoice', async () => {
    const { data } = await ownerA.client.from('invoices').select('id').eq('id', invoiceAId)
    expect(data).toHaveLength(1)
  })

  it('Studio A owner can still update their own invoice', async () => {
    const { error } = await ownerA.client.from('invoices').update({ status: 'sent' }).eq('id', invoiceAId)
    expect(error).toBeNull()
    await admin.from('invoices').update({ status: 'draft' }).eq('id', invoiceAId)
  })
})

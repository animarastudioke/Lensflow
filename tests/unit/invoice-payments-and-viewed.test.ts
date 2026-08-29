import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 12: getInvoicePayments() and markInvoiceViewed() are both
// new this step. getInvoicePayments surfaces real rows from the payments
// ledger (previously shown nowhere for a specific invoice) -- tenant-scoped
// and restricted to 'completed' transactions only (a pending/failed M-Pesa
// attempt moved no money, so it isn't "payment history"). markInvoiceViewed
// implements the 'sent' -> 'viewed' transition the enum has always had but
// nothing ever triggered.

const dbCalls: { table: string; op: string; eq: Record<string, unknown> }[] = []
let studioInvoiceRow: { id: string } | null = { id: 'invoice-1' }
let paymentsRows: Record<string, unknown>[] = []

function makeBuilder(table: string): any {
  const builder: any = { _eq: {} }
  builder.select = () => builder
  builder.update = (payload: unknown) => {
    // Stores a live reference to builder._eq (not a spread copy) --
    // .update() runs before the .eq() calls that follow it in the real
    // chain (.update(x).eq('id', ...).eq('status', ...)), so a snapshot
    // taken here would miss them. Reading call.eq after the whole
    // chain (and the `await` on it) has resolved sees the final state.
    builder._eq['payload'] = payload
    dbCalls.push({ table, op: 'update', eq: builder._eq })
    return builder
  }
  builder.eq = (column: string, value: unknown) => {
    builder._eq[column] = value
    dbCalls.push({ table, op: 'eq', eq: { [column]: value } })
    return builder
  }
  builder.order = () => builder
  builder.single = async () => {
    if (table === 'invoices') return { data: studioInvoiceRow, error: studioInvoiceRow ? null : { message: 'not found' } }
    if (table === 'studios') return { data: { id: 'studio-1' }, error: null }
    return { data: null, error: null }
  }
  // getInvoicePayments's final query has no .single() -- it awaits the
  // builder directly, so `then` is what resolves it.
  builder.then = (resolve: (v: unknown) => void) => {
    if (table === 'payments') return resolve({ data: paymentsRows, error: null })
    resolve({ data: null, error: null })
  }
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (table: string) => makeBuilder(table) }),
}))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: (table: string) => makeBuilder(table) } }))

const invoicesActions = await import('@/lib/actions/invoices')

beforeEach(() => {
  dbCalls.length = 0
  studioInvoiceRow = { id: 'invoice-1' }
  paymentsRows = [
    { id: 'pay-1', amount: 5000, currency: 'KES', method: 'mpesa', status: 'completed', provider_receipt_number: 'ABC123', created_at: '2026-08-25T00:00:00Z' },
  ]
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getInvoicePayments: tenant scoping', () => {
  it('returns real completed payment rows for an invoice the caller owns', async () => {
    const result = await invoicesActions.getInvoicePayments('invoice-1', 'studio-slug')
    expect(result).toHaveLength(1)
    expect(result[0]?.provider_receipt_number).toBe('ABC123')
  })

  it('returns an empty list when the invoice does not belong to the caller\'s studio (no leak, no throw)', async () => {
    studioInvoiceRow = null
    const result = await invoicesActions.getInvoicePayments('invoice-1', 'studio-slug')
    expect(result).toEqual([])
  })

  it('scopes the payments query itself to both invoice_id and the caller\'s studio_id', async () => {
    await invoicesActions.getInvoicePayments('invoice-1', 'studio-slug')
    const paymentsEqCalls = dbCalls.filter((c) => c.table === 'payments' && c.op === 'eq')
    const columns = paymentsEqCalls.map((c) => Object.keys(c.eq)[0])
    expect(columns).toContain('invoice_id')
    expect(columns).toContain('studio_id')
    expect(columns).toContain('status')
  })
})

describe('markInvoiceViewed: one-way sent -> viewed transition', () => {
  it('updates status to viewed, gated on the current status already being sent', async () => {
    await invoicesActions.markInvoiceViewed('invoice-1')
    const update = dbCalls.find((c) => c.table === 'invoices' && c.op === 'update')
    expect(update).toBeDefined()
    expect((update!.eq['payload'] as { status: string }).status).toBe('viewed')
    expect(update!.eq['status']).toBe('sent')
  })

  it('never throws, even if nothing matches (best-effort by design)', async () => {
    await expect(invoicesActions.markInvoiceViewed('nonexistent-id')).resolves.toBeUndefined()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 7 regression coverage: the dashboard's "needs attention"
// section is powered by getOverdueInvoices(), a new tenant-scoped read of
// the real, already-relied-upon invoices.status = 'overdue' value (the
// same status the Invoices list itself already filters/counts on). This
// file proves the query is scoped to the resolved studio, computes
// balance due correctly, respects the limit, and fails safe (empty, not
// a throw) when the studio can't be resolved.

const eqCalls: { table: string; column: string; value: unknown }[] = []
let studioResult: { id: string } | null = { id: 'studio-1' }
let invoicesResult: { data: unknown[] | null; count: number | null } = { data: [], count: 0 }
let limitArg: number | null = null

function makeStudiosBuilder() {
  const builder: any = {}
  builder.select = () => builder
  builder.eq = (column: string, value: unknown) => {
    eqCalls.push({ table: 'studios', column, value })
    return builder
  }
  builder.single = async () => ({ data: studioResult })
  return builder
}

function makeInvoicesBuilder() {
  const builder: any = {}
  builder.select = () => builder
  builder.eq = (column: string, value: unknown) => {
    eqCalls.push({ table: 'invoices', column, value })
    return builder
  }
  builder.order = () => builder
  builder.limit = (n: number) => {
    limitArg = n
    return builder
  }
  // Supabase's query builder is itself thenable -- awaiting the chain
  // resolves to {data, count}, no explicit terminal method needed.
  builder.then = (resolve: (v: unknown) => void) => resolve(invoicesResult)
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'studios') return makeStudiosBuilder()
      if (table === 'invoices') return makeInvoicesBuilder()
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

const { getOverdueInvoices } = await import('@/lib/actions/dashboard')

beforeEach(() => {
  eqCalls.length = 0
  limitArg = null
  studioResult = { id: 'studio-1' }
  invoicesResult = { data: [], count: 0 }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getOverdueInvoices', () => {
  it('scopes the invoices query to the resolved studio and the overdue status', async () => {
    invoicesResult = {
      data: [{ id: 'inv-1', invoice_number: 'INV-001', total: 500, amount_paid: 100, due_date: '2026-01-01', client: { name: 'Jane Doe' } }],
      count: 1,
    }
    await getOverdueInvoices('test-studio', 5)

    expect(eqCalls).toContainEqual({ table: 'studios', column: 'slug', value: 'test-studio' })
    expect(eqCalls).toContainEqual({ table: 'invoices', column: 'studio_id', value: 'studio-1' })
    expect(eqCalls).toContainEqual({ table: 'invoices', column: 'status', value: 'overdue' })
  })

  it('computes balance due as total minus amount_paid and resolves the client name', async () => {
    invoicesResult = {
      data: [{ id: 'inv-1', invoice_number: 'INV-001', total: 500, amount_paid: 150, due_date: '2026-01-01', client: { name: 'Jane Doe' } }],
      count: 1,
    }
    const result = await getOverdueInvoices('test-studio')

    expect(result.invoices).toEqual([
      { id: 'inv-1', invoiceNumber: 'INV-001', clientName: 'Jane Doe', balanceDue: 350, dueDate: '2026-01-01' },
    ])
    expect(result.totalCount).toBe(1)
  })

  it('handles a null client embed without throwing', async () => {
    invoicesResult = {
      data: [{ id: 'inv-1', invoice_number: 'INV-001', total: 200, amount_paid: 0, due_date: null, client: null }],
      count: 1,
    }
    const result = await getOverdueInvoices('test-studio')
    expect(result.invoices[0]?.clientName).toBeNull()
  })

  it('respects the limit passed to the query', async () => {
    await getOverdueInvoices('test-studio', 3)
    expect(limitArg).toBe(3)
  })

  it('returns empty, not a throw, when the studio slug does not resolve', async () => {
    studioResult = null
    const result = await getOverdueInvoices('nonexistent-studio')
    expect(result).toEqual({ invoices: [], totalCount: 0 })
  })

  it('returns empty when the invoices query returns no data', async () => {
    invoicesResult = { data: null, count: null }
    const result = await getOverdueInvoices('test-studio')
    expect(result).toEqual({ invoices: [], totalCount: 0 })
  })
})

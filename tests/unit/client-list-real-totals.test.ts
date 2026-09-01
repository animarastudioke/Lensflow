import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 15: ClientList's "Total Spent"/"Value" column and sort, and
// the Leads page's reuse of the same field, all read clients.total_spent
// directly -- a column already confirmed dead in Client Detail's own code
// comment (src/app/dashboard/(dashboard)/[studioSlug]/clients/[clientId]/
// page.tsx): the trigger that once kept it in sync only exists in
// supabase/migrations/_archived and was never carried into the current
// baseline, so it sits at its NOT NULL DEFAULT 0 forever regardless of how
// much a client has actually paid. This proves getClients() now overrides
// that dead value with a real aggregate over the same invoices table
// Client Detail already trusts for its own totalPaid figure -- in one
// studio-scoped query, not a per-client N+1.

const dbCalls: { table: string; op: string }[] = []
let clientRows: { id: string; total_spent: number; total_orders: number }[] = []
let invoiceRows: { client_id: string | null; amount_paid: number }[] = []

function makeBuilder(table: string): any {
  const builder: any = {}
  builder.select = (..._args: unknown[]) => {
    dbCalls.push({ table, op: 'select' })
    return builder
  }
  builder.eq = () => builder
  builder.or = () => builder
  builder.in = () => builder
  builder.order = () => builder
  builder.single = async () => ({ data: { id: 'studio-1' }, error: null })
  builder.then = (resolve: (v: unknown) => void) => {
    if (table === 'clients') return resolve({ data: clientRows, error: null, count: clientRows.length })
    if (table === 'invoices') return resolve({ data: invoiceRows, error: null, count: invoiceRows.length })
    return resolve({ data: [], error: null, count: 0 })
  }
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (table: string) => makeBuilder(table) }),
}))

vi.mock('@/lib/entitlements', () => ({
  requireEntitlement: vi.fn(async () => {}),
}))

vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: vi.fn(async () => ({ userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' })),
}))

const { getClients } = await import('@/lib/actions/clients')

beforeEach(() => {
  dbCalls.length = 0
  clientRows = [
    { id: 'client-1', total_spent: 0, total_orders: 0 }, // dead column: always 0 in the DB
    { id: 'client-2', total_spent: 0, total_orders: 0 },
  ]
  invoiceRows = [
    { client_id: 'client-1', amount_paid: 30000 },
    { client_id: 'client-1', amount_paid: 15000 },
    { client_id: 'client-2', amount_paid: 0 }, // an unpaid invoice still counts as an "order"
  ]
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getClients: total_spent/total_orders are computed from real invoices, not the dead column', () => {
  it('sums amount_paid across a client\'s real invoices, ignoring the stale DB column', async () => {
    const { clients } = await getClients('studio-slug')
    const client1 = clients.find((c) => c.id === 'client-1')
    expect(client1?.total_spent).toBe(45000)
  })

  it('counts real invoices as orders, including an unpaid one', async () => {
    const { clients } = await getClients('studio-slug')
    const client2 = clients.find((c) => c.id === 'client-2')
    expect(client2?.total_orders).toBe(1)
    expect(client2?.total_spent).toBe(0)
  })

  it('a client with no invoices at all shows a real, honest 0 -- not undefined or a stale value', async () => {
    clientRows.push({ id: 'client-3', total_spent: 999, total_orders: 99 }) // simulates a bogus pre-existing DB value
    const { clients } = await getClients('studio-slug')
    const client3 = clients.find((c) => c.id === 'client-3')
    expect(client3?.total_spent).toBe(0)
    expect(client3?.total_orders).toBe(0)
  })

  it('only queries invoices once for the whole list, not once per client (no N+1)', async () => {
    await getClients('studio-slug')
    expect(dbCalls.filter((c) => c.table === 'invoices' && c.op === 'select')).toHaveLength(1)
  })
})

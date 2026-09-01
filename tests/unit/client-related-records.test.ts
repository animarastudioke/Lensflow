import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 9 regression coverage: Client Detail's "Related work"
// sections (Bookings, Projects, Invoices, Galleries) reuse the existing
// list Server Actions with a new optional clientId filter, rather than
// duplicating query logic in the page. This proves each function actually
// scopes by client_id when asked, and that getGalleries stops excluding
// archived galleries specifically when scoped to one client (a CRM history
// view should show the client's full gallery history, not just the
// currently-active subset the general Galleries list shows).

const eqCalls: { table: string; column: string; value: unknown }[] = []
const neqCalls: { table: string; column: string; value: unknown }[] = []

function makeBuilder(table: string): any {
  const builder: any = {}
  builder.select = () => builder
  builder.eq = (column: string, value: unknown) => {
    eqCalls.push({ table, column, value })
    return builder
  }
  builder.neq = (column: string, value: unknown) => {
    neqCalls.push({ table, column, value })
    return builder
  }
  builder.order = () => builder
  builder.range = () => builder
  builder.limit = () => builder
  builder.ilike = () => builder
  builder.single = async () => ({ data: { id: 'studio-1' }, error: null })
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (table: string) => makeBuilder(table) }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (table: string) => makeBuilder(table) },
}))

vi.mock('@/lib/entitlements', () => ({
  requireEntitlement: vi.fn(async () => {}),
  hasEntitlement: vi.fn(async () => true),
  canCreateGallery: vi.fn(async () => ({ allowed: true })),
  getEffectivePlan: vi.fn(async () => null),
  getSubscriptionAccessState: vi.fn(async () => null),
  reserveUploadQuota: vi.fn(async () => ({ allowed: true })),
  releaseUploadReservations: vi.fn(async () => {}),
}))

const bookingsActions = await import('@/lib/actions/bookings')
const projectsActions = await import('@/lib/actions/projects')
const invoicesActions = await import('@/lib/actions/invoices')
const galleriesActions = await import('@/lib/actions/galleries')

const CLIENT_ID = 'client-123'

beforeEach(() => {
  eqCalls.length = 0
  neqCalls.length = 0
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Client Detail related-record queries scope to the requested client', () => {
  it('getBookings({ clientId }) filters by client_id', async () => {
    await bookingsActions.getBookings('studio-slug', { clientId: CLIENT_ID })
    expect(eqCalls).toContainEqual({ table: 'bookings', column: 'client_id', value: CLIENT_ID })
  })

  it('getBookings() without clientId does not filter by client_id', async () => {
    await bookingsActions.getBookings('studio-slug')
    expect(eqCalls.some(c => c.table === 'bookings' && c.column === 'client_id')).toBe(false)
  })

  it('getProjects({ clientId }) filters by client_id', async () => {
    await projectsActions.getProjects('studio-slug', { clientId: CLIENT_ID })
    expect(eqCalls).toContainEqual({ table: 'projects', column: 'client_id', value: CLIENT_ID })
  })

  it('getInvoices({ clientId }) filters by client_id', async () => {
    await invoicesActions.getInvoices('studio-slug', { clientId: CLIENT_ID })
    expect(eqCalls).toContainEqual({ table: 'invoices', column: 'client_id', value: CLIENT_ID })
  })

  it('getGalleries({ clientId }) filters by client_id and does not exclude archived galleries', async () => {
    await galleriesActions.getGalleries('studio-slug', { clientId: CLIENT_ID })
    expect(eqCalls).toContainEqual({ table: 'galleries', column: 'client_id', value: CLIENT_ID })
    expect(neqCalls.some(c => c.table === 'galleries' && c.column === 'status')).toBe(false)
  })

  it('getGalleries() without clientId still excludes archived galleries (unchanged general-list behavior)', async () => {
    await galleriesActions.getGalleries('studio-slug')
    expect(neqCalls).toContainEqual({ table: 'galleries', column: 'status', value: 'archived' })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 12: two real cross-studio vulnerabilities found in this
// step's audit, both in src/lib/actions/invoices.ts, both fixed here.
//
// 1) sendInvoiceSentEmail(invoiceId, studioId) looked up the invoice by id
//    ALONE (no studio_id filter) via the service-role client. Its only
//    caller, updateInvoiceStatus, is a Server Action whose invoiceId
//    argument is fully caller-controlled -- nothing stops a Studio A
//    member from calling updateInvoiceStatus(<studio B's invoice id>,
//    'sent', 'studio-a-slug'). The status UPDATE itself was correctly
//    scoped (.eq('studio_id', membership.studioId)), so it silently
//    matched zero rows for a foreign id -- but the email side effect ran
//    unconditionally afterward and, unscoped, found Studio B's real
//    invoice and emailed Studio B's real client using Studio A's own
//    branding. Fixed by adding .eq('studio_id', studioId) to that lookup.
//
// 2) bulkUpdateInvoiceStatus's 'paid' branch looped over the raw
//    invoiceIds array and read+wrote amount_paid with NO studio_id filter
//    at all, even though the bulk status UPDATE just above it was
//    correctly scoped. A Studio A caller with invoices:manage_payments
//    could pass a Studio B invoice id through this action and have its
//    amount_paid silently overwritten to match its own total -- a real
//    cross-tenant financial-record write, not just an email. Fixed by
//    scoping both the select and the update in that loop to
//    membership.studioId.

const dbCalls: { table: string; op: string; eq: Record<string, unknown> }[] = []
let studioAInvoice: Record<string, unknown> | null = null

function makeBuilder(table: string): any {
  const builder: any = { _eq: {} }
  builder.select = () => builder
  builder.update = (payload: unknown) => {
    dbCalls.push({ table, op: 'update', eq: { ...builder._eq, payload } })
    return builder
  }
  builder.eq = (column: string, value: unknown) => {
    builder._eq[column] = value
    return builder
  }
  builder.in = (column: string, values: unknown[]) => {
    builder._eq[column] = values
    return builder
  }
  builder.single = async () => {
    if (table === 'invoices') {
      const matchesId = builder._eq['id'] === studioAInvoice?.['id']
      const matchesStudio = !('studio_id' in builder._eq) || builder._eq['studio_id'] === studioAInvoice?.['studio_id']
      dbCalls.push({ table, op: 'select', eq: { ...builder._eq } })
      if (matchesId && matchesStudio && studioAInvoice) return { data: studioAInvoice, error: null }
      return { data: null, error: { message: 'not found' } }
    }
    if (table === 'studios') {
      return { data: { name: 'Studio A', logo_url: null, brand_color: null, currency: 'KES' }, error: null }
    }
    return { data: null, error: null }
  }
  builder.then = (resolve: (v: unknown) => void) => {
    dbCalls.push({ table, op: 'update-resolve', eq: { ...builder._eq } })
    resolve({ data: null, error: null })
  }
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (table: string) => makeBuilder(table) }),
}))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: (table: string) => makeBuilder(table) } }))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

const sendEmailMock = vi.fn(async () => ({ success: true }))
vi.mock('@/lib/email/resend', () => ({ sendEmail: (...args: unknown[]) => sendEmailMock(...args) }))
vi.mock('@/lib/email/templates', () => ({
  invoiceSentEmail: () => ({ subject: 'Invoice sent', html: '<p>test</p>' }),
}))
vi.mock('@/lib/actions/clients', () => ({ clientBelongsToStudio: vi.fn(async () => true) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const invoicesActions = await import('@/lib/actions/invoices')

beforeEach(() => {
  dbCalls.length = 0
  studioAInvoice = {
    id: 'invoice-a-1',
    studio_id: 'studio-a',
    total: 5000,
    invoice_number: 'INV-001',
    due_date: '2026-09-01',
    share_token: 'tok-abc',
    client: { name: 'Studio A Client', email: 'client-a@example.com' },
  }
  requireStudioPermissionMock.mockReset()
  sendEmailMock.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('updateInvoiceStatus: cross-studio invoiceId is rejected before any email fires', () => {
  it('legitimate: Studio A caller sending Studio A\'s own invoice succeeds and emails Studio A\'s real client', async () => {
    requireStudioPermissionMock.mockResolvedValue({ userId: 'user-a', studioId: 'studio-a', role: 'studio_owner' })
    const result = await invoicesActions.updateInvoiceStatus('invoice-a-1', 'sent', 'studio-a-slug')
    expect(result).toBeUndefined()
    await new Promise((r) => setTimeout(r, 0))
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'client-a@example.com' }))
  })

  it('malicious: Studio B caller passing Studio A\'s invoice id is denied and no email is sent', async () => {
    requireStudioPermissionMock.mockResolvedValue({ userId: 'user-b', studioId: 'studio-b', role: 'studio_owner' })
    const result = await invoicesActions.updateInvoiceStatus('invoice-a-1', 'sent', 'studio-b-slug')
    expect(result).toEqual({ error: 'Invoice not found' })
    await new Promise((r) => setTimeout(r, 0))
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})

describe('bulkUpdateInvoiceStatus: cross-studio invoice id in the array cannot have its amount_paid overwritten', () => {
  it('only scopes the per-id amount_paid write to the caller\'s own studio_id', async () => {
    requireStudioPermissionMock.mockResolvedValue({ userId: 'user-b', studioId: 'studio-b', role: 'studio_owner' })
    await invoicesActions.bulkUpdateInvoiceStatus(['invoice-a-1'], 'paid', 'studio-b-slug')

    // The per-id select/update inside the 'paid' loop must carry studio_id: 'studio-b'
    // (the caller's own), never leaving it unscoped -- which is what let it read/write
    // a foreign invoice before this fix.
    const perIdCalls = dbCalls.filter((c) => c.table === 'invoices' && (c.op === 'select' || c.op === 'update'))
    for (const call of perIdCalls) {
      if ('id' in call.eq) {
        expect(call.eq['studio_id']).toBe('studio-b')
      }
    }
  })
})

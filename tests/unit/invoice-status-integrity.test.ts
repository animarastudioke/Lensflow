import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 14: two real defects found in this step's audit, both in
// src/lib/actions/invoices.ts.
//
// 1) createInvoice inserted amount_paid: 0 unconditionally, regardless of
//    the status field it also accepted straight from the form -- creating
//    an invoice directly as "Paid" or "Partial" produced a row that
//    claimed to be paid while still showing the full amount as balance
//    due (total - amount_paid). NewInvoiceForm's status dropdown exposed
//    both as freely selectable options.
//
// 2) updateInvoice had the same gap for an EXISTING invoice, but worse:
//    updateInvoiceStatus (the dedicated Mark-as-paid action) requires the
//    invoices:manage_payments permission specifically for the 'paid'
//    transition and correctly sets amount_paid/paid_at -- but updateInvoice
//    only ever checked the weaker invoices:update and never touched
//    amount_paid/paid_at at all. A user who could edit invoices but not
//    manage payments could bypass the payments permission entirely by
//    setting status to "Paid" through the Edit form instead of the
//    dedicated button, landing on the same broken "Paid but balance due
//    still shows the full amount" state.
//
// Both are now rejected server-side (not just hidden in the UI): the only
// legitimate paths into 'paid'/'partial' are a real M-Pesa payment
// (src/lib/payments/resolve.ts) or updateInvoiceStatus. updateInvoice still
// allows an ALREADY paid/partial invoice to be re-saved (editing notes/line
// items) without touching status -- only a transition INTO paid/partial is
// rejected.
//
// Also covers a smaller consistency fix: updateInvoice now fires the same
// invoice-sent email createInvoice and updateInvoiceStatus already send,
// but only on a genuine transition into 'sent' (never on re-saving an
// already-sent invoice).

let invoiceStatus = 'draft'
const dbCalls: { table: string; op: string }[] = []

function makeBuilder(table: string): any {
  const builder: any = {}
  builder.select = () => builder
  builder.insert = () => {
    dbCalls.push({ table, op: 'insert' })
    return builder
  }
  builder.update = () => {
    dbCalls.push({ table, op: 'update' })
    return builder
  }
  builder.delete = () => builder
  builder.eq = () => builder
  builder.in = () => builder
  builder.single = async () => {
    if (table === 'invoices') {
      return {
        data: {
          id: 'invoice-1',
          status: invoiceStatus,
          invoice_number: 'INV-001',
          total: 500,
          due_date: '2026-09-01',
          share_token: 'tok-1',
          client: { name: 'Real Client', email: 'client@example.com' },
        },
        error: null,
      }
    }
    if (table === 'clients') return { data: { id: 'client-1' }, error: null }
    if (table === 'studios') return { data: { name: 'Studio', logo_url: null, brand_color: null, currency: 'KES' }, error: null }
    return { data: null, error: null }
  }
  builder.count = 0
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null, count: 0 })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: (table: string) => makeBuilder(table),
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: (table: string) => makeBuilder(table) } }))
vi.mock('@/lib/entitlements', () => ({ requireEntitlement: vi.fn(async () => {}) }))
vi.mock('@/lib/actions/clients', () => ({ clientBelongsToStudio: vi.fn(async () => true) }))

const sendEmailMock = vi.fn(async () => ({ success: true }))
vi.mock('@/lib/email/resend', () => ({ sendEmail: (...args: unknown[]) => sendEmailMock(...args) }))
vi.mock('@/lib/email/templates', () => ({
  invoiceSentEmail: () => ({ subject: 'Invoice sent', html: '<p>test</p>' }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) }) }))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

const invoicesActions = await import('@/lib/actions/invoices')

function formDataWithItems(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('studio_slug', 'studio-slug')
  fd.set('items_json', JSON.stringify([{ description: 'Session', quantity: 1, unit_price: 500 }]))
  fd.set('status', 'draft')
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  dbCalls.length = 0
  invoiceStatus = 'draft'
  requireStudioPermissionMock.mockReset()
  requireStudioPermissionMock.mockResolvedValue({ userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' })
  sendEmailMock.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('createInvoice: cannot be created directly as Paid or Partial', () => {
  it('rejects status "paid" and never inserts', async () => {
    await expect(invoicesActions.createInvoice(formDataWithItems({ status: 'paid' }))).rejects.toThrow(/Paid or Partial/)
    expect(dbCalls.some((c) => c.table === 'invoices' && c.op === 'insert')).toBe(false)
  })

  it('rejects status "partial" and never inserts', async () => {
    await expect(invoicesActions.createInvoice(formDataWithItems({ status: 'partial' }))).rejects.toThrow(/Paid or Partial/)
    expect(dbCalls.some((c) => c.table === 'invoices' && c.op === 'insert')).toBe(false)
  })

  it('still allows creating as draft (sanity check the guard is not over-broad)', async () => {
    await invoicesActions.createInvoice(formDataWithItems({ status: 'draft' })).catch(() => {})
    expect(dbCalls.some((c) => c.table === 'invoices' && c.op === 'insert')).toBe(true)
  })
})

describe('updateInvoice: cannot be used to MOVE an invoice into Paid or Partial', () => {
  it('rejects draft -> paid and never updates', async () => {
    invoiceStatus = 'draft'
    const fd = formDataWithItems({ id: 'invoice-1', status: 'paid' })
    await expect(invoicesActions.updateInvoice(fd)).rejects.toThrow(/Mark as paid/)
    expect(dbCalls.some((c) => c.table === 'invoices' && c.op === 'update')).toBe(false)
  })

  it('rejects sent -> partial and never updates', async () => {
    invoiceStatus = 'sent'
    const fd = formDataWithItems({ id: 'invoice-1', status: 'partial' })
    await expect(invoicesActions.updateInvoice(fd)).rejects.toThrow(/Mark as paid/)
    expect(dbCalls.some((c) => c.table === 'invoices' && c.op === 'update')).toBe(false)
  })

  it('allows re-saving an ALREADY-paid invoice without changing status (editing notes/items)', async () => {
    invoiceStatus = 'paid'
    const fd = formDataWithItems({ id: 'invoice-1', status: 'paid' })
    await invoicesActions.updateInvoice(fd).catch(() => {})
    expect(dbCalls.some((c) => c.table === 'invoices' && c.op === 'update')).toBe(true)
  })

  it('allows moving a paid invoice to a different status (e.g. refunded)', async () => {
    invoiceStatus = 'paid'
    const fd = formDataWithItems({ id: 'invoice-1', status: 'refunded' })
    await invoicesActions.updateInvoice(fd).catch(() => {})
    expect(dbCalls.some((c) => c.table === 'invoices' && c.op === 'update')).toBe(true)
  })
})

describe('updateInvoice: sent-email consistency with createInvoice/updateInvoiceStatus', () => {
  it('fires the invoice-sent email on a genuine draft -> sent transition', async () => {
    invoiceStatus = 'draft'
    const fd = formDataWithItems({ id: 'invoice-1', status: 'sent' })
    await invoicesActions.updateInvoice(fd).catch(() => {})
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('does not re-send when the invoice was already sent (re-saving other fields)', async () => {
    invoiceStatus = 'sent'
    const fd = formDataWithItems({ id: 'invoice-1', status: 'sent' })
    await invoicesActions.updateInvoice(fd).catch(() => {})
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('does not send when status stays draft', async () => {
    invoiceStatus = 'draft'
    const fd = formDataWithItems({ id: 'invoice-1', status: 'draft' })
    await invoicesActions.updateInvoice(fd).catch(() => {})
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})

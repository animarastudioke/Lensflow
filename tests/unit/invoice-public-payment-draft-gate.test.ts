import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 14: every invoice gets a real share_token at creation
// regardless of status (migration 022's column DEFAULT), so the public
// invoice link for a still-draft invoice is a real, reachable URL even
// though the studio never chose to "send" it. initiateMpesaInvoicePaymentPublic
// previously only excluded 'cancelled'/'refunded' invoices from accepting a
// real M-Pesa payment -- a draft (numbers possibly still being edited by
// the studio, never deliberately shared) could still have real money
// collected against it via its token. Fixed by rejecting 'draft' the same
// way 'cancelled'/'refunded' already were, enforced server-side (not just
// by hiding the payment button on the public page, which is UI only).

let invoiceOverride: unknown = {
  id: 'invoice-1', studio_id: 'studio-1', total: 100, amount_paid: 0,
  invoice_number: 'INV-1', client_id: 'client-1', status: 'sent',
}

function makeBuilder(singleResult: unknown = null): any {
  const builder: any = {}
  for (const method of ['select', 'insert', 'update', 'eq']) {
    builder[method] = () => builder
  }
  builder.single = async () => ({ data: singleResult, error: null })
  builder.maybeSingle = async () => ({ data: null, error: null })
  return builder
}

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'invoices') return makeBuilder(invoiceOverride)
      if (table === 'studios') return makeBuilder({ currency: 'KES' })
      if (table === 'payments') return makeBuilder({ id: 'payment-1' })
      return makeBuilder()
    },
  },
}))

vi.mock('@/lib/entitlements', () => ({ requireEntitlement: vi.fn(async () => {}) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const initiateStkPush = vi.fn()
vi.mock('@/lib/payments/mpesa', () => ({
  initiateStkPush: (...args: unknown[]) => initiateStkPush(...args),
  queryStkPushStatus: vi.fn(),
  normalizeKenyanPhone: (input: string) => (input.startsWith('07') ? `254${input.slice(1)}` : null),
}))

const { initiateMpesaInvoicePaymentPublic } = await import('@/lib/actions/mpesa-payments')

beforeEach(() => {
  initiateStkPush.mockReset()
  initiateStkPush.mockResolvedValue({ checkoutRequestId: 'ws_CO_1', merchantRequestId: 'mr-1', customerMessage: 'Enter PIN' })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('initiateMpesaInvoicePaymentPublic: draft invoices cannot accept payment', () => {
  it('rejects a draft invoice and never initiates an STK push', async () => {
    invoiceOverride = { id: 'invoice-1', studio_id: 'studio-1', total: 100, amount_paid: 0, invoice_number: 'INV-1', client_id: 'client-1', status: 'draft' }
    const result = await initiateMpesaInvoicePaymentPublic('tok-1', '0712345678')
    expect(result).toEqual({ error: 'This invoice has not been sent yet and can\'t accept payments.' })
    expect(initiateStkPush).not.toHaveBeenCalled()
  })

  it('still allows payment on a sent invoice (guard is not over-broad)', async () => {
    invoiceOverride = { id: 'invoice-1', studio_id: 'studio-1', total: 100, amount_paid: 0, invoice_number: 'INV-1', client_id: 'client-1', status: 'sent' }
    const result = await initiateMpesaInvoicePaymentPublic('tok-1', '0712345678')
    expect(initiateStkPush).toHaveBeenCalledTimes(1)
    expect('error' in (result as object)).toBe(false)
  })

  it('still allows payment on a viewed/partial/overdue invoice (existing legitimate transitions intact)', async () => {
    for (const status of ['viewed', 'partial', 'overdue']) {
      initiateStkPush.mockClear()
      invoiceOverride = { id: 'invoice-1', studio_id: 'studio-1', total: 100, amount_paid: 0, invoice_number: 'INV-1', client_id: 'client-1', status }
      const result = await initiateMpesaInvoicePaymentPublic('tok-1', '0712345678')
      expect(initiateStkPush).toHaveBeenCalledTimes(1)
      expect('error' in (result as object)).toBe(false)
    }
  })

  it('still rejects cancelled/refunded invoices (pre-existing behavior unchanged)', async () => {
    for (const status of ['cancelled', 'refunded']) {
      initiateStkPush.mockClear()
      invoiceOverride = { id: 'invoice-1', studio_id: 'studio-1', total: 100, amount_paid: 0, invoice_number: 'INV-1', client_id: 'client-1', status }
      const result = await initiateMpesaInvoicePaymentPublic('tok-1', '0712345678')
      expect(result).toEqual({ error: `This invoice is ${status} and can't accept new payments.` })
      expect(initiateStkPush).not.toHaveBeenCalled()
    }
  })
})

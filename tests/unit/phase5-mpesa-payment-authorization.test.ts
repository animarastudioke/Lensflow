import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 5 P2 regression coverage: initiateMpesaInvoicePayment and
// pollMpesaPaymentStatus previously used requireMembership() (any active
// studio member, no permission check) as their entire authorization
// boundary -- initiateMpesaInvoicePayment's actual payments INSERT runs
// through supabaseAdmin (service role, bypasses RLS), so that weak
// membership check was the ONLY thing standing between an editor (zero
// financial permissions in ROLE_PERMISSIONS) and triggering a real
// M-Pesa charge attempt. Fixed by requiring payments:create (initiate)
// / payments:read (poll), matching the Phase 2/3 requireStudioPermission
// pattern used elsewhere. This file proves the wiring without ever
// calling a real M-Pesa API -- initiateStkPush/queryStkPushStatus are
// fully mocked.

const dbCalls: string[] = []

function makeBuilder(singleResult: unknown = null): any {
  const builder: any = {}
  const record = (name: string) => (..._args: unknown[]) => {
    if (name === 'insert' || name === 'update') dbCalls.push(name)
    return builder
  }
  for (const method of ['select', 'insert', 'update', 'eq', 'or']) {
    builder[method] = record(method)
  }
  builder.single = async () => ({ data: singleResult, error: null })
  builder.maybeSingle = async () => ({ data: null, error: null })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: (table: string) => {
      if (table === 'invoices') {
        return makeBuilder({ id: 'invoice-1', total: 100, amount_paid: 0, invoice_number: 'INV-1', client_id: 'client-1', status: 'sent' })
      }
      if (table === 'payments') {
        return makeBuilder({ status: 'completed', provider_checkout_id: 'ws_CO_1', failure_reason: null, provider_receipt_number: 'ABC123' })
      }
      return makeBuilder()
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) =>
      table === 'payments'
        ? makeBuilder({ id: 'payment-1', status: 'pending', provider_checkout_id: null, failure_reason: null, provider_receipt_number: null })
        : makeBuilder(),
  },
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

vi.mock('@/lib/entitlements', () => ({
  requireEntitlement: vi.fn(async () => {}),
}))

vi.mock('@/lib/actions/studios', () => ({
  getStudioCurrency: async () => 'KES',
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const initiateStkPush = vi.fn()
const queryStkPushStatus = vi.fn()
vi.mock('@/lib/payments/mpesa', () => ({
  initiateStkPush: (...args: unknown[]) => initiateStkPush(...args),
  queryStkPushStatus: (...args: unknown[]) => queryStkPushStatus(...args),
  normalizeKenyanPhone: (input: string) => (input.startsWith('07') ? `254${input.slice(1)}` : null),
}))

vi.mock('@/lib/payments/resolve', () => ({
  applyMpesaPaymentOutcome: vi.fn(async () => {}),
}))

const { initiateMpesaInvoicePayment, pollMpesaPaymentStatus } = await import('@/lib/actions/mpesa-payments')

const DENIED = { error: 'You do not have permission to perform this action' }
const ALLOWED = { userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' as const }

beforeEach(() => {
  dbCalls.length = 0
  requireStudioPermissionMock.mockReset()
  initiateStkPush.mockReset()
  queryStkPushStatus.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Phase 5 P2: initiateMpesaInvoicePayment requests payments:create', () => {
  it('requests payments:create', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    initiateStkPush.mockResolvedValue({ checkoutRequestId: 'ws_CO_1', customerMessage: 'Enter PIN' })
    await initiateMpesaInvoicePayment('invoice-1', 'studio-slug', '0712345678')
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('payments:create')
  })

  it('denied: never calls initiateStkPush and never inserts a payment (editor-equivalent, no payments:create)', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const result = await initiateMpesaInvoicePayment('invoice-1', 'studio-slug', '0712345678')
    expect(result).toEqual(DENIED)
    expect(initiateStkPush).not.toHaveBeenCalled()
    expect(dbCalls).toEqual([])
  })

  it('authorized: proceeds to initiate the STK push and insert the payment', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    initiateStkPush.mockResolvedValue({ checkoutRequestId: 'ws_CO_1', customerMessage: 'Enter PIN' })
    const result = await initiateMpesaInvoicePayment('invoice-1', 'studio-slug', '0712345678')
    expect(initiateStkPush).toHaveBeenCalledTimes(1)
    expect(dbCalls).toContain('insert')
    expect('error' in (result as object)).toBe(false)
  })
})

describe('Phase 5 P2: pollMpesaPaymentStatus requests payments:read (narrower than :create)', () => {
  it('requests payments:read', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await pollMpesaPaymentStatus('payment-1', 'studio-slug')
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('payments:read')
  })

  it('denied: never queries payment status (editor-equivalent, no payments:read)', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const result = await pollMpesaPaymentStatus('payment-1', 'studio-slug')
    expect(result).toEqual(DENIED)
    expect(queryStkPushStatus).not.toHaveBeenCalled()
  })

  it('authorized: proceeds to return the payment status', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    const result = await pollMpesaPaymentStatus('payment-1', 'studio-slug')
    expect('error' in (result as object)).toBe(false)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasPermission } from '@/lib/auth/permissions'

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

// Mutable per-test overrides -- lets individual tests simulate "invoice
// belongs to another studio" (query returns null), a different
// total/amount_paid (balance-limit tests), or an already-pending payment
// (duplicate-pending tests) without redefining the whole vi.mock factory.
let invoiceOverride: unknown = { id: 'invoice-1', total: 100, amount_paid: 0, invoice_number: 'INV-1', client_id: 'client-1', status: 'sent' }
let existingPendingOverride: unknown = null

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
        return makeBuilder(invoiceOverride)
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
    from: (table: string) => {
      if (table !== 'payments') return makeBuilder()
      const builder = makeBuilder({ id: 'payment-1', status: 'pending', provider_checkout_id: null, failure_reason: null, provider_receipt_number: null })
      // maybeSingle() is only ever used by the existing-pending-payment
      // check in initiateMpesaInvoicePayment -- override just that call.
      builder.maybeSingle = async () => ({ data: existingPendingOverride, error: null })
      return builder
    },
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
const ALLOWED_PHOTOGRAPHER = { userId: 'user-1', studioId: 'studio-1', role: 'photographer' as const }

beforeEach(() => {
  dbCalls.length = 0
  requireStudioPermissionMock.mockReset()
  initiateStkPush.mockReset()
  queryStkPushStatus.mockReset()
  invoiceOverride = { id: 'invoice-1', total: 100, amount_paid: 0, invoice_number: 'INV-1', client_id: 'client-1', status: 'sent' }
  existingPendingOverride = null
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

// Phase 8 Target 2: photographer is granted payments:create/payments:read
// (src/lib/auth/permissions.ts ROLE_PERMISSIONS + migration 043's matching
// has_studio_permission() CASE addition). These assertions use the REAL,
// unmocked hasPermission()/ROLE_PERMISSIONS -- only @/lib/auth/server
// (requireStudioPermission itself) is mocked in this file, not the
// permissions module it wraps.
describe('Phase 8 Target 2: photographer payments:create/payments:read grant (ROLE_PERMISSIONS)', () => {
  it('photographer is granted payments:create', () => {
    expect(hasPermission('photographer', 'payments:create')).toBe(true)
  })

  it('photographer is granted payments:read', () => {
    expect(hasPermission('photographer', 'payments:read')).toBe(true)
  })

  it('photographer is NOT granted payments:refund', () => {
    expect(hasPermission('photographer', 'payments:refund')).toBe(false)
  })

  it('photographer is NOT granted payments:manage_providers', () => {
    expect(hasPermission('photographer', 'payments:manage_providers')).toBe(false)
  })

  it('team_member remains denied payments:create and payments:read', () => {
    expect(hasPermission('team_member', 'payments:create')).toBe(false)
    expect(hasPermission('team_member', 'payments:read')).toBe(false)
  })

  it('editor remains denied payments:create and payments:read', () => {
    expect(hasPermission('editor', 'payments:create')).toBe(false)
    expect(hasPermission('editor', 'payments:read')).toBe(false)
  })

  it('studio_owner and super_admin are unaffected (already granted, unchanged)', () => {
    expect(hasPermission('studio_owner', 'payments:create')).toBe(true)
    expect(hasPermission('studio_owner', 'payments:read')).toBe(true)
    expect(hasPermission('super_admin', 'payments:create')).toBe(true)
    expect(hasPermission('super_admin', 'payments:read')).toBe(true)
  })
})

// Phase 8 Target 2: proves photographer clearing the (now-correct)
// permission gate does NOT bypass any of initiateMpesaInvoicePayment's
// other controls -- these are pre-existing, unmodified checks in
// mpesa-payments.ts; this file only changes which role can reach them.
// No real Safaricom network call happens anywhere in this file --
// initiateStkPush/queryStkPushStatus are mocked above.
describe('Phase 8 Target 2: photographer reaches the M-Pesa authorization boundary without weakening any other control', () => {
  it('photographer, once authorized, can initiate an STK push and have the payment recorded (same mechanics as studio_owner)', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED_PHOTOGRAPHER)
    initiateStkPush.mockResolvedValue({ checkoutRequestId: 'ws_CO_1', customerMessage: 'Enter PIN' })
    const result = await initiateMpesaInvoicePayment('invoice-1', 'studio-slug', '0712345678')
    expect(initiateStkPush).toHaveBeenCalledTimes(1)
    expect(dbCalls).toContain('insert')
    expect('error' in (result as object)).toBe(false)
  })

  it('photographer, once authorized, can poll payment status (same mechanics as studio_owner)', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED_PHOTOGRAPHER)
    const result = await pollMpesaPaymentStatus('payment-1', 'studio-slug')
    expect('error' in (result as object)).toBe(false)
  })

  it('a photographer-authorized request for an invoice belonging to another studio is still rejected (studio scoping intact)', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED_PHOTOGRAPHER)
    invoiceOverride = null // simulates .eq('studio_id', membership.studioId) matching no row
    const result = await initiateMpesaInvoicePayment('invoice-1', 'studio-slug', '0712345678')
    expect(result).toEqual({ error: 'Invoice not found' })
    expect(initiateStkPush).not.toHaveBeenCalled()
    expect(dbCalls).not.toContain('insert')
  })

  it('a photographer-authorized request cannot charge more than the invoice balance due (amount limit intact)', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED_PHOTOGRAPHER)
    invoiceOverride = { id: 'invoice-1', total: 100, amount_paid: 0, invoice_number: 'INV-1', client_id: 'client-1', status: 'sent' }
    const result = await initiateMpesaInvoicePayment('invoice-1', 'studio-slug', '0712345678', 150)
    expect(result).toEqual({ error: 'Amount must be between 1 and 100 KES.' })
    expect(initiateStkPush).not.toHaveBeenCalled()
  })

  it('a photographer-authorized request against a fully-paid invoice is rejected (invoice-status validation intact)', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED_PHOTOGRAPHER)
    invoiceOverride = { id: 'invoice-1', total: 100, amount_paid: 100, invoice_number: 'INV-1', client_id: 'client-1', status: 'sent' }
    const result = await initiateMpesaInvoicePayment('invoice-1', 'studio-slug', '0712345678')
    expect(result).toEqual({ error: 'This invoice is already fully paid.' })
    expect(initiateStkPush).not.toHaveBeenCalled()
  })

  it('a photographer-authorized request is rejected while a pending push already exists on the invoice (duplicate-pending protection intact)', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED_PHOTOGRAPHER)
    existingPendingOverride = { id: 'existing-pending-payment' }
    const result = await initiateMpesaInvoicePayment('invoice-1', 'studio-slug', '0712345678')
    expect(result).toEqual({ error: 'A payment request is already pending on this invoice. Wait for it to resolve, or check its status.' })
    expect(initiateStkPush).not.toHaveBeenCalled()
  })

  it('team_member remains denied for both actions (unaffected by this phase)', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const initiateResult = await initiateMpesaInvoicePayment('invoice-1', 'studio-slug', '0712345678')
    expect(initiateResult).toEqual(DENIED)
    const pollResult = await pollMpesaPaymentStatus('payment-1', 'studio-slug')
    expect(pollResult).toEqual(DENIED)
    expect(initiateStkPush).not.toHaveBeenCalled()
  })

  it('editor remains denied for both actions (unaffected by this phase)', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const initiateResult = await initiateMpesaInvoicePayment('invoice-1', 'studio-slug', '0712345678')
    expect(initiateResult).toEqual(DENIED)
    const pollResult = await pollMpesaPaymentStatus('payment-1', 'studio-slug')
    expect(pollResult).toEqual(DENIED)
    expect(initiateStkPush).not.toHaveBeenCalled()
  })
})

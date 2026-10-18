import { beforeEach, describe, expect, it, vi } from 'vitest'

// Covers the two hardening rules: (1) a success is only applied when the
// caller attests Safaricom corroborated it, (2) pollers re-query recently
// failed rows (never completed rows, never old failed rows).

const state = vi.hoisted(() => ({
  payment: null as Record<string, unknown> | null,
  rows: [] as Array<Record<string, unknown>>,
}))

function builder(result: () => unknown): any {
  const b: any = {}
  for (const m of ['select', 'eq', 'not', 'in', 'order', 'limit', 'update']) b[m] = () => b
  b.single = async () => ({ data: result(), error: null })
  b.maybeSingle = b.single
  return b
}

const fromTable = (table: string) =>
  builder(() => {
    if (table === 'studio_members') return { studio_id: 'st1', role: 'studio_owner' }
    if (table === 'invoices') return { id: 'inv1' }
    if (table === 'payments') return state.payment
    return null
  })

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: fromTable,
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: fromTable } }))
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: async () => ({ userId: 'u1', studioId: 'st1', role: 'studio_owner' }),
}))
vi.mock('@/lib/entitlements', () => ({ requireEntitlement: vi.fn(), hasEntitlement: vi.fn() }))
vi.mock('@/lib/actions/studios', () => ({ getStudioCurrency: async () => 'KES' }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const queryStkPushStatus = vi.fn()
vi.mock('@/lib/payments/mpesa', async () => {
  const actual = await vi.importActual<typeof import('@/lib/payments/mpesa')>('@/lib/payments/mpesa')
  return { ...actual, queryStkPushStatus: (...a: unknown[]) => queryStkPushStatus(...a) }
})

const applyOutcome = vi.fn()
vi.mock('@/lib/payments/resolve', () => ({
  applyMpesaPaymentOutcome: (...a: unknown[]) => applyOutcome(...a),
}))

const { pollMpesaPaymentStatus, pollMpesaPaymentStatusPublic } = await import('@/lib/actions/mpesa-payments')
const { pollPlanSubscriptionPaymentStatus } = await import('@/lib/actions/subscription-payments')
const { pollProductPurchaseStatus } = await import('@/lib/actions/storefront')
const { FAILED_PAYMENT_REQUERY_WINDOW_MS } = await import('@/lib/payments/requery')

const SUCCESS = { status: 'completed', resultCode: 0, resultDesc: 'ok' }
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

const pollers: Array<[string, () => Promise<unknown>]> = [
  ['pollMpesaPaymentStatus', () => pollMpesaPaymentStatus('p1', 'slug')],
  ['pollMpesaPaymentStatusPublic', () => pollMpesaPaymentStatusPublic('p1', 'tok')],
  ['pollPlanSubscriptionPaymentStatus', () => pollPlanSubscriptionPaymentStatus('p1', 'slug')],
  ['pollProductPurchaseStatus', () => pollProductPurchaseStatus('p1')],
]

function setPayment(status: string, updatedAt: string, over: Record<string, unknown> = {}) {
  state.payment = {
    id: 'p1', status, provider_checkout_id: 'ws_CO_1', failure_reason: status === 'failed' ? 'Cancelled' : null,
    provider_receipt_number: null, order_id: 'o1', updated_at: updatedAt, ...over,
  }
}

beforeEach(() => {
  queryStkPushStatus.mockReset()
  applyOutcome.mockReset()
  applyOutcome.mockResolvedValue({ handled: true, status: 'completed' })
})

describe('pollers attest corroboration and re-query recent failures', () => {
  describe.each(pollers)('%s', (_name, poll) => {
    it('passes corroborated: true to applyMpesaPaymentOutcome for a pending row', async () => {
      setPayment('pending', minutesAgo(1))
      queryStkPushStatus.mockResolvedValue(SUCCESS)
      await poll()
      expect(applyOutcome).toHaveBeenCalledTimes(1)
      expect(applyOutcome).toHaveBeenCalledWith(
        expect.objectContaining({ checkoutRequestId: 'ws_CO_1', resultCode: 0, corroborated: true })
      )
    })

    it('re-queries a recently failed row and completes it on a corroborated success', async () => {
      setPayment('failed', minutesAgo(5))
      queryStkPushStatus.mockResolvedValue(SUCCESS)
      const res = await poll()
      expect(queryStkPushStatus).toHaveBeenCalledWith('ws_CO_1')
      expect(applyOutcome).toHaveBeenCalledWith(expect.objectContaining({ resultCode: 0, corroborated: true }))
      expect(res).toMatchObject({ status: 'completed' })
    })

    it('keeps a recently failed row failed on a definitive failure no-op', async () => {
      setPayment('failed', minutesAgo(5))
      queryStkPushStatus.mockResolvedValue({ status: 'failed', resultCode: 1032, resultDesc: 'Cancelled' })
      applyOutcome.mockResolvedValue({ handled: false, status: 'unknown' })
      expect(await poll()).toMatchObject({ status: 'failed', failureReason: 'Cancelled' })
    })

    it('never re-queries a completed row', async () => {
      setPayment('completed', minutesAgo(1))
      await poll()
      expect(queryStkPushStatus).not.toHaveBeenCalled()
      expect(applyOutcome).not.toHaveBeenCalled()
    })

    it('never re-queries a failed row outside the window', async () => {
      setPayment('failed', new Date(Date.now() - FAILED_PAYMENT_REQUERY_WINDOW_MS - 60_000).toISOString())
      expect(await poll()).toMatchObject({ status: 'failed' })
      expect(queryStkPushStatus).not.toHaveBeenCalled()
      expect(applyOutcome).not.toHaveBeenCalled()
    })

    it('never re-queries a failed row without a checkout id', async () => {
      setPayment('failed', minutesAgo(1), { provider_checkout_id: null })
      await poll()
      expect(queryStkPushStatus).not.toHaveBeenCalled()
    })
  })
})

describe('callback route attests corroboration only after Safaricom confirms', () => {
  it('passes corroborated: true on a corroborated success and omits it on a failure', async () => {
    const { POST } = await import('@/app/api/payments/mpesa/callback/route')
    const req = (code: number) =>
      new Request('http://x/cb', {
        method: 'POST',
        body: JSON.stringify({ Body: { stkCallback: { MerchantRequestID: 'm', CheckoutRequestID: 'ws_CO_1', ResultCode: code, ResultDesc: 'd' } } }),
      }) as unknown as Parameters<typeof POST>[0]

    queryStkPushStatus.mockResolvedValue({ status: 'completed', resultDesc: 'ok' })
    await POST(req(0))
    expect(applyOutcome).toHaveBeenLastCalledWith(expect.objectContaining({ resultCode: 0, corroborated: true }))

    await POST(req(1032))
    const failArgs = applyOutcome.mock.calls.at(-1)?.[0] as { corroborated?: true }
    expect(failArgs.corroborated).toBeUndefined()
  })
})

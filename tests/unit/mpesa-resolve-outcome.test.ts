import { beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory stand-in for the service-role client. `payments` honours the
// conditional UPDATE (eq provider_checkout_id + status filter) exactly like
// Postgres would, so the exactly-once behaviour under test is real, not
// scripted. Other tables just record writes and return canned reads.
interface PaymentRow {
  id: string
  provider_checkout_id: string
  status: 'pending' | 'completed' | 'failed'
  invoice_id: string | null
  plan_id: string | null
  order_id: string | null
  amount: number
  studio_id: string
  [k: string]: unknown
}

const db = vi.hoisted(() => ({
  payments: [] as PaymentRow[],
  writes: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  notifications: [] as unknown[],
  emails: [] as unknown[],
}))

vi.mock('@/lib/supabase/admin', () => {
  const canned: Record<string, unknown> = {
    studios: { name: 'S', logo_url: null, brand_color: null, slug: 's' },
    invoices: {
      total: 1000, amount_paid: 0, invoice_number: 'INV-1', share_token: 't',
      client: { name: 'C', email: 'c@x.com' },
    },
    plans: { name: 'Pro', price_cents: 5000 },
  }
  return {
    supabaseAdmin: {
      from(table: string) {
        const filters: Array<(r: PaymentRow) => boolean> = []
        let updatePayload: Record<string, unknown> | null = null
        const builder: Record<string, unknown> = {}
        const resolveRow = () => {
          if (table === 'payments' && updatePayload) {
            const row = db.payments.find((r) => filters.every((f) => f(r)))
            if (!row) return { data: null, error: null }
            Object.assign(row, updatePayload)
            return { data: { ...row }, error: null }
          }
          return { data: canned[table] ?? null, error: null }
        }
        builder['select'] = () => builder
        builder['update'] = (p: Record<string, unknown>) => {
          updatePayload = p
          if (table !== 'payments') db.writes.push({ table, payload: p })
          return builder
        }
        builder['eq'] = (col: string, val: unknown) => { filters.push((r) => r[col] === val); return builder }
        builder['in'] = (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return builder }
        builder['not'] = () => builder
        builder['order'] = () => builder
        builder['limit'] = () => builder
        builder['maybeSingle'] = async () => resolveRow()
        builder['single'] = async () => resolveRow()
        builder['then'] = (res: (v: unknown) => void) => res({ data: [], error: null })
        return builder
      },
    },
  }
})

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn(async (m: unknown) => { db.emails.push(m); return { success: true } }),
}))
vi.mock('@/lib/email/templates', () => ({ paymentReceiptEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/constants', () => ({ APP_CONSTANTS: { URL: 'https://app.test' } }))
vi.mock('@/lib/actions/notifications', () => ({
  createNotification: vi.fn(async (...a: unknown[]) => { db.notifications.push(a) }),
}))

import { applyMpesaPaymentOutcome } from '@/lib/payments/resolve'
import { interpretStkQueryResponse, stkQueryToOutcome } from '@/lib/payments/mpesa'

const invoiceWrites = () => db.writes.filter((w) => w.table === 'invoices')
const subWrites = () => db.writes.filter((w) => w.table === 'subscriptions')

function seed(status: PaymentRow['status'], over: Partial<PaymentRow> = {}) {
  db.payments.push({
    id: 'p1', provider_checkout_id: 'ws_CO_1', status, invoice_id: 'inv1',
    plan_id: null, order_id: null, amount: 500, studio_id: 'st1', ...over,
  })
}

const ok = { checkoutRequestId: 'ws_CO_1', resultCode: 0, resultDesc: 'ok', receiptNumber: 'RCPT1' }
const fail = { checkoutRequestId: 'ws_CO_1', resultCode: 1032, resultDesc: 'Cancelled' }

beforeEach(() => {
  db.payments.length = 0
  db.writes.length = 0
  db.notifications.length = 0
  db.emails.length = 0
})

describe('applyMpesaPaymentOutcome', () => {
  it('success then success applies effects exactly once', async () => {
    seed('pending')
    const first = await applyMpesaPaymentOutcome(ok)
    const second = await applyMpesaPaymentOutcome(ok)
    expect(first).toEqual({ handled: true, status: 'completed' })
    expect(second.handled).toBe(false)
    expect(invoiceWrites()).toHaveLength(1)
    expect(db.emails).toHaveLength(1)
    expect(db.payments[0]?.status).toBe('completed')
  })

  it('failed then late success completes the payment and applies effects once', async () => {
    seed('pending')
    expect((await applyMpesaPaymentOutcome(fail)).status).toBe('failed')
    expect(invoiceWrites()).toHaveLength(0)

    const late = await applyMpesaPaymentOutcome(ok)
    expect(late).toEqual({ handled: true, status: 'completed' })
    expect(db.payments[0]).toMatchObject({ status: 'completed', provider_receipt_number: 'RCPT1', failure_reason: null })
    expect(invoiceWrites()).toHaveLength(1)
    expect(invoiceWrites()[0]?.payload).toMatchObject({ amount_paid: 500, status: 'partial' })

    // A duplicate of the late success must not double-credit.
    expect((await applyMpesaPaymentOutcome(ok)).handled).toBe(false)
    expect(invoiceWrites()).toHaveLength(1)
  })

  it('late success on a failed subscription payment upgrades the plan once', async () => {
    seed('failed', { invoice_id: null, plan_id: 'plan-pro' })
    await applyMpesaPaymentOutcome(ok)
    await applyMpesaPaymentOutcome(ok)
    expect(subWrites()).toHaveLength(1)
    expect(subWrites()[0]?.payload).toMatchObject({ plan_id: 'plan-pro', status: 'active' })
  })

  it('success then failure leaves the payment completed and changes nothing', async () => {
    seed('pending')
    await applyMpesaPaymentOutcome(ok)
    const writesBefore = db.writes.length
    const late = await applyMpesaPaymentOutcome(fail)
    expect(late.handled).toBe(false)
    expect(db.payments[0]?.status).toBe('completed')
    expect(db.payments[0]?.failure_reason).toBeNull()
    expect(db.writes).toHaveLength(writesBefore)
  })

  it('failure then failure is a no-op', async () => {
    seed('pending')
    await applyMpesaPaymentOutcome(fail)
    expect((await applyMpesaPaymentOutcome({ ...fail, resultDesc: 'other' })).handled).toBe(false)
    expect(db.payments[0]?.failure_reason).toBe('Cancelled')
  })

  it('unmatched checkout id is a safe no-op', async () => {
    seed('pending')
    const res = await applyMpesaPaymentOutcome({ ...ok, checkoutRequestId: 'nope' })
    expect(res).toEqual({ handled: false, status: 'unknown' })
    expect(db.payments[0]?.status).toBe('pending')
    expect(db.writes).toHaveLength(0)
  })
})

describe('STK query -> poll outcome mapping', () => {
  const map = (httpOk: boolean, body: unknown) => stkQueryToOutcome(interpretStkQueryResponse(httpOk, body))

  it('leaves in-progress / unknown / malformed responses pending (null)', () => {
    expect(map(false, { errorCode: '500.001.1001', errorMessage: 'The transaction is being processed' })).toBeNull()
    expect(map(true, { errorCode: '500.001.1001' })).toBeNull()
    expect(map(false, {})).toBeNull()
    expect(map(true, null)).toBeNull()
    expect(map(true, {})).toBeNull()
    expect(map(true, { ResponseCode: '0' })).toBeNull()
    expect(map(true, { ResponseCode: '0', ResultCode: 'abc' })).toBeNull()
    expect(map(true, { ResponseCode: '0', ResultCode: '' })).toBeNull()
    expect(map(true, { ResponseCode: '1', ResultCode: '1032' })).toBeNull()
  })

  it('maps a real non-zero ResultCode to a definitive failure', () => {
    expect(map(true, { ResponseCode: '0', ResultCode: '1032', ResultDesc: 'Request cancelled by user' })).toEqual({
      resultCode: 1032, resultDesc: 'Request cancelled by user',
    })
    expect(map(true, { ResponseCode: '0', ResultCode: 1, ResultDesc: 'Insufficient' })?.resultCode).toBe(1)
  })

  it('maps ResultCode 0 to success', () => {
    expect(map(true, { ResponseCode: '0', ResultCode: '0', ResultDesc: 'ok' })?.resultCode).toBe(0)
  })
})

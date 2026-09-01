import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { applyMpesaPaymentOutcome } from '@/lib/payments/resolve'

/**
 * Phase 12 Step 12: applyMpesaPaymentOutcome's notification-creation call
 * sits downstream of an atomic UPDATE whose WHERE clause only matches a
 * payment row that is still 'pending' (see the function's own comment) --
 * on paper this means a retried/duplicated Safaricom callback for an
 * already-resolved payment can never reach the createNotification() call a
 * second time. This proves that against the real database with a real
 * invoice/payment pair, exactly the scenario Daraja is documented to
 * produce (the same callback delivered more than once), rather than
 * trusting the source-level reasoning alone.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('mpesa-payment-notification-integrity.test.ts requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.local).')
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-mpesanotif-${RUN_ID}`

let studioId: string
let invoiceId: string
let paymentId: string
let checkoutRequestId: string

beforeAll(async () => {
  const { data: studio } = await admin.from('studios').insert({ name: RUN_TAG, slug: RUN_TAG, owner_id: null }).select('id').single()
  studioId = studio!.id

  const { data: invoice } = await admin
    .from('invoices')
    .insert({ studio_id: studioId, invoice_number: `${RUN_TAG}-INV-1`, status: 'sent', subtotal: 5000, total: 5000, amount_paid: 0 })
    .select('id')
    .single()
  invoiceId = invoice!.id

  checkoutRequestId = `${RUN_TAG}-checkout-1`
  const { data: payment } = await admin
    .from('payments')
    .insert({
      studio_id: studioId, invoice_id: invoiceId, amount: 5000, method: 'mpesa', status: 'pending',
      provider_checkout_id: checkoutRequestId,
    })
    .select('id')
    .single()
  paymentId = payment!.id
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
})

describe('applyMpesaPaymentOutcome: one real payment outcome, exactly one notification', () => {
  it('a successful outcome updates the payment/invoice and creates exactly one payment_received notification', async () => {
    const outcome = await applyMpesaPaymentOutcome({
      checkoutRequestId,
      resultCode: 0,
      resultDesc: 'The service request is processed successfully.',
      receiptNumber: `${RUN_TAG}-RECEIPT`,
    })
    expect(outcome.handled).toBe(true)
    expect(outcome.status).toBe('completed')

    const { data: paymentRow } = await admin.from('payments').select('status').eq('id', paymentId).single()
    expect(paymentRow?.status).toBe('completed')

    const { data: invoiceRow } = await admin.from('invoices').select('status, amount_paid').eq('id', invoiceId).single()
    expect(invoiceRow?.status).toBe('paid')
    expect(invoiceRow?.amount_paid).toBe(5000)

    const { data: notifications } = await admin
      .from('notifications')
      .select('id, type, link')
      .eq('studio_id', studioId)
      .eq('type', 'payment_received')
    expect(notifications).toHaveLength(1)
    expect(notifications?.[0]?.link).toBe(`/dashboard/${RUN_TAG}/invoices/${invoiceId}`)
  })

  it('a retried callback for the same (already-resolved) CheckoutRequestID does not create a second notification', async () => {
    const outcome = await applyMpesaPaymentOutcome({
      checkoutRequestId,
      resultCode: 0,
      resultDesc: 'The service request is processed successfully.',
      receiptNumber: `${RUN_TAG}-RECEIPT`,
    })
    // The row is no longer 'pending', so the UPDATE's WHERE clause matches
    // nothing -- this is the documented safe no-op, not a second success.
    expect(outcome.handled).toBe(false)

    const { data: notifications } = await admin
      .from('notifications')
      .select('id')
      .eq('studio_id', studioId)
      .eq('type', 'payment_received')
    expect(notifications).toHaveLength(1)

    const { data: invoiceRow } = await admin.from('invoices').select('amount_paid').eq('id', invoiceId).single()
    expect(invoiceRow?.amount_paid).toBe(5000) // not double-applied
  })
})

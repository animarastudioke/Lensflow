'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireEntitlement } from '@/lib/entitlements'
import { requireStudioPermission } from '@/lib/auth/server'
import { initiateStkPush, normalizeKenyanPhone, queryStkPushStatus } from '@/lib/payments/mpesa'
import { applyMpesaPaymentOutcome } from '@/lib/payments/resolve'
import { getStudioCurrency } from '@/lib/actions/studios'

/**
 * Dashboard-user-initiated M-Pesa collection: enters (or confirms) the
 * client's phone number and triggers an STK push on the client's behalf.
 * Kept alongside initiateMpesaInvoicePaymentPublic (the client's own
 * self-serve path on the public invoice page) for cases where staff are
 * collecting in person or over a call rather than pointing the client at
 * their invoice link.
 *
 * Phase 5 P2: previously gated only by requireMembership() (any active
 * member, no permission check) -- the actual payments INSERT below runs
 * through supabaseAdmin (service role, bypasses RLS), so that weak check
 * was the ENTIRE authorization boundary for triggering a real charge
 * attempt. An editor (zero financial permissions in ROLE_PERMISSIONS)
 * could previously initiate and poll a real M-Pesa charge. Now requires
 * payments:create, matching ROLE_PERMISSIONS exactly -- granted only to
 * studio_owner/super_admin today. Note this file's own prior doc comment
 * described "photographer-initiated" collection as the intended
 * workflow, but photographer holds no payments:* permission in
 * ROLE_PERMISSIONS -- flagged in the Phase 5 report as a product
 * decision to make (grant photographer payments:create, or accept this
 * workflow is now owner/super_admin-only), not assumed here.
 */
export async function initiateMpesaInvoicePayment(
  invoiceId: string,
  studioSlug: string,
  phoneNumberInput: string,
  amount?: number
): Promise<{ paymentId: string; checkoutRequestId: string; customerMessage: string } | { error: string }> {
  const membership = await requireStudioPermission('payments:create')
  if ('error' in membership) return membership

  await requireEntitlement(membership.studioId, 'payments')

  const currency = await getStudioCurrency(studioSlug)
  if (currency !== 'KES') {
    return {
      error: `M-Pesa only settles in KES, but this studio bills in ${currency}. Record this payment manually instead.`,
    }
  }

  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total, amount_paid, invoice_number, client_id, status')
    .eq('id', invoiceId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!invoice) return { error: 'Invoice not found' }
  if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
    return { error: `This invoice is ${invoice.status} and can't accept new payments.` }
  }

  const balanceDue = Math.max(invoice.total - invoice.amount_paid, 0)
  if (balanceDue <= 0) {
    return { error: 'This invoice is already fully paid.' }
  }

  const chargeAmount = amount ?? balanceDue
  if (chargeAmount <= 0 || chargeAmount > balanceDue) {
    return { error: `Amount must be between 1 and ${balanceDue} ${currency}.` }
  }

  const phoneNumber = normalizeKenyanPhone(phoneNumberInput)
  if (!phoneNumber) {
    return { error: 'Enter a valid Kenyan phone number (e.g. 0712345678).' }
  }

  // Check for an existing pending push on this invoice before starting
  // another one — avoids stacking duplicate STK prompts on the client's phone.
  const { data: existingPending } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('invoice_id', invoiceId)
    .eq('status', 'pending')
    .eq('method', 'mpesa')
    .maybeSingle()

  if (existingPending) {
    return { error: 'A payment request is already pending on this invoice. Wait for it to resolve, or check its status.' }
  }

  let stkResult
  try {
    stkResult = await initiateStkPush({
      phoneNumber,
      amount: chargeAmount,
      accountReference: invoice.invoice_number,
      transactionDesc: 'Invoice payment',
    })
  } catch (err) {
    console.error('M-Pesa STK push failed:', err)
    return { error: err instanceof Error ? err.message : 'Failed to reach M-Pesa. Try again.' }
  }

  const { data: payment, error: insertError } = await supabaseAdmin
    .from('payments')
    .insert({
      studio_id: membership.studioId,
      invoice_id: invoiceId,
      client_id: invoice.client_id,
      amount: chargeAmount,
      currency: 'KES',
      method: 'mpesa',
      status: 'pending',
      phone_number: phoneNumber,
      provider_checkout_id: stkResult.checkoutRequestId,
      provider_merchant_request_id: stkResult.merchantRequestId,
    })
    .select('id')
    .single()

  if (insertError || !payment) {
    console.error('Failed to record pending M-Pesa payment:', insertError)
    return { error: 'M-Pesa request was sent, but we failed to record it — contact support before retrying.' }
  }

  revalidatePath(`/dashboard/${studioSlug}/invoices/${invoiceId}`)

  return {
    paymentId: payment.id,
    checkoutRequestId: stkResult.checkoutRequestId,
    customerMessage: stkResult.customerMessage,
  }
}

/**
 * Client-initiated M-Pesa collection: the public invoice link (no auth, no
 * studio membership) lets the client themselves enter their phone number and
 * trigger the STK push, rather than requiring the photographer to do it on
 * their behalf. Mirrors initiateMpesaInvoicePayment's validation exactly,
 * just resolved by the invoice's share_token instead of a session.
 */
export async function initiateMpesaInvoicePaymentPublic(
  token: string,
  phoneNumberInput: string,
  amount?: number
): Promise<{ paymentId: string; checkoutRequestId: string; customerMessage: string } | { error: string }> {
  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('id, studio_id, total, amount_paid, invoice_number, client_id, status')
    .eq('share_token', token)
    .single()

  if (!invoice) return { error: 'Invoice not found' }

  await requireEntitlement(invoice.studio_id, 'payments')

  const { data: studio } = await supabaseAdmin
    .from('studios')
    .select('currency')
    .eq('id', invoice.studio_id)
    .single()

  if (studio?.currency !== 'KES') {
    return { error: 'M-Pesa payment isn’t available for this invoice. Contact the studio to pay another way.' }
  }

  if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
    return { error: `This invoice is ${invoice.status} and can't accept new payments.` }
  }

  const balanceDue = Math.max(invoice.total - invoice.amount_paid, 0)
  if (balanceDue <= 0) {
    return { error: 'This invoice is already fully paid.' }
  }

  const chargeAmount = amount ?? balanceDue
  if (chargeAmount <= 0 || chargeAmount > balanceDue) {
    return { error: `Amount must be between 1 and ${balanceDue}.` }
  }

  const phoneNumber = normalizeKenyanPhone(phoneNumberInput)
  if (!phoneNumber) {
    return { error: 'Enter a valid Kenyan phone number (e.g. 0712345678).' }
  }

  const { data: existingPending } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('invoice_id', invoice.id)
    .eq('status', 'pending')
    .eq('method', 'mpesa')
    .maybeSingle()

  if (existingPending) {
    return { error: 'A payment request is already pending on this invoice. Wait for it to resolve, or check its status.' }
  }

  let stkResult
  try {
    stkResult = await initiateStkPush({
      phoneNumber,
      amount: chargeAmount,
      accountReference: invoice.invoice_number,
      transactionDesc: 'Invoice payment',
    })
  } catch (err) {
    console.error('M-Pesa STK push failed:', err)
    return { error: err instanceof Error ? err.message : 'Failed to reach M-Pesa. Try again.' }
  }

  const { data: payment, error: insertError } = await supabaseAdmin
    .from('payments')
    .insert({
      studio_id: invoice.studio_id,
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      amount: chargeAmount,
      currency: 'KES',
      method: 'mpesa',
      status: 'pending',
      phone_number: phoneNumber,
      provider_checkout_id: stkResult.checkoutRequestId,
      provider_merchant_request_id: stkResult.merchantRequestId,
    })
    .select('id')
    .single()

  if (insertError || !payment) {
    console.error('Failed to record pending M-Pesa payment:', insertError)
    return { error: 'M-Pesa request was sent, but we failed to record it — contact the studio before retrying.' }
  }

  revalidatePath(`/invoice/${token}`)

  return {
    paymentId: payment.id,
    checkoutRequestId: stkResult.checkoutRequestId,
    customerMessage: stkResult.customerMessage,
  }
}

/** Public counterpart to pollMpesaPaymentStatus — resolved by share_token instead of studio membership. */
export async function pollMpesaPaymentStatusPublic(
  paymentId: string,
  token: string
): Promise<MpesaPaymentStatus | { error: string }> {
  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('id')
    .eq('share_token', token)
    .single()

  if (!invoice) return { error: 'Invoice not found' }

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('status, provider_checkout_id, failure_reason, provider_receipt_number')
    .eq('id', paymentId)
    .eq('invoice_id', invoice.id)
    .single()

  if (!payment) return { error: 'Payment not found' }

  if (payment.status !== 'pending') {
    return {
      status: payment.status as 'completed' | 'failed',
      failureReason: payment.failure_reason,
      receiptNumber: payment.provider_receipt_number,
    }
  }

  if (!payment.provider_checkout_id) {
    return { status: 'pending', failureReason: null, receiptNumber: null }
  }

  const queryResult = await queryStkPushStatus(payment.provider_checkout_id).catch((err) => {
    console.error('M-Pesa status query failed:', err)
    return { status: 'pending' as const, resultDesc: '' }
  })

  if (queryResult.status === 'pending') {
    return { status: 'pending', failureReason: null, receiptNumber: null }
  }

  const outcome = await applyMpesaPaymentOutcome({
    checkoutRequestId: payment.provider_checkout_id,
    resultCode: queryResult.status === 'completed' ? 0 : 1,
    resultDesc: queryResult.resultDesc,
  })

  revalidatePath(`/invoice/${token}`)

  return {
    status: outcome.status === 'unknown' ? 'pending' : outcome.status,
    failureReason: outcome.status === 'failed' ? queryResult.resultDesc : null,
    receiptNumber: null,
  }
}

export interface MpesaPaymentStatus {
  status: 'pending' | 'completed' | 'failed'
  failureReason: string | null
  receiptNumber: string | null
}

/**
 * Polling fallback for environments where Safaricom's webhook can't reach
 * this app (e.g. local development against a localhost callback URL). Also
 * updates the DB if it discovers a resolved outcome the webhook hasn't
 * delivered yet — same idempotent path the webhook uses, so calling this
 * repeatedly is always safe.
 *
 * Phase 5 P2: gated on payments:read (a read-intent action), not
 * payments:create -- narrower than initiateMpesaInvoicePayment's gate,
 * per this phase's "do not broaden access" instruction. Both permissions
 * happen to have the identical grantee set today (studio_owner/
 * super_admin only), so this doesn't change who can poll today; it
 * decouples the check from a permission this function doesn't actually
 * exercise (it never creates a payment).
 */
export async function pollMpesaPaymentStatus(
  paymentId: string,
  studioSlug: string
): Promise<MpesaPaymentStatus | { error: string }> {
  const membership = await requireStudioPermission('payments:read')
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { data: payment } = await supabase
    .from('payments')
    .select('status, provider_checkout_id, failure_reason, provider_receipt_number')
    .eq('id', paymentId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!payment) return { error: 'Payment not found' }

  if (payment.status !== 'pending') {
    return {
      status: payment.status as 'completed' | 'failed',
      failureReason: payment.failure_reason,
      receiptNumber: payment.provider_receipt_number,
    }
  }

  if (!payment.provider_checkout_id) {
    return { status: 'pending', failureReason: null, receiptNumber: null }
  }

  const queryResult = await queryStkPushStatus(payment.provider_checkout_id).catch((err) => {
    console.error('M-Pesa status query failed:', err)
    return { status: 'pending' as const, resultDesc: '' }
  })

  if (queryResult.status === 'pending') {
    return { status: 'pending', failureReason: null, receiptNumber: null }
  }

  const outcome = await applyMpesaPaymentOutcome({
    checkoutRequestId: payment.provider_checkout_id,
    resultCode: queryResult.status === 'completed' ? 0 : 1,
    resultDesc: queryResult.resultDesc,
  })

  revalidatePath(`/dashboard/${studioSlug}/invoices`)

  return {
    status: outcome.status === 'unknown' ? 'pending' : outcome.status,
    failureReason: outcome.status === 'failed' ? queryResult.resultDesc : null,
    receiptNumber: null,
  }
}

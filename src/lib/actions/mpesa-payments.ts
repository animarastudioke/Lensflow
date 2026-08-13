'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireEntitlement } from '@/lib/entitlements'
import { initiateStkPush, normalizeKenyanPhone, queryStkPushStatus } from '@/lib/payments/mpesa'
import { applyMpesaPaymentOutcome } from '@/lib/payments/resolve'
import { getStudioCurrency } from '@/lib/actions/studios'

async function requireMembership(): Promise<{ error: string } | { userId: string; studioId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return { error: 'No active studio membership' }

  return { userId: user.id, studioId: membership.studio_id }
}

/**
 * Photographer-initiated M-Pesa collection: the dashboard user enters (or
 * confirms) the client's phone number and triggers an STK push, which pops
 * a PIN prompt on that phone. There's no separate client-facing invoice
 * portal yet (see the earlier app-inventory — client portal doesn't exist),
 * so this is the real, working path to "collect deposit" today rather than
 * a stand-in for a portal that isn't built.
 */
export async function initiateMpesaInvoicePayment(
  invoiceId: string,
  studioSlug: string,
  phoneNumberInput: string,
  amount?: number
): Promise<{ paymentId: string; checkoutRequestId: string; customerMessage: string } | { error: string }> {
  const membership = await requireMembership()
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
 */
export async function pollMpesaPaymentStatus(
  paymentId: string,
  studioSlug: string
): Promise<MpesaPaymentStatus | { error: string }> {
  const membership = await requireMembership()
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

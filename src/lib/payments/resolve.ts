import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Applies a resolved M-Pesa result to the matching payment row and, on
 * success, the linked invoice. Called from two places — the Safaricom
 * webhook, and the polling fallback used when a webhook can't reach this
 * environment (e.g. local development, where MPESA_CALLBACK_URL points at
 * localhost) — so the logic lives here once rather than being duplicated.
 *
 * Race-safe by construction: the UPDATE's WHERE clause only matches a row
 * that is still 'pending', and returns the row only if it actually matched.
 * If the webhook and a poll both resolve the same payment at once, exactly
 * one of them gets the row back; the other sees no match and no-ops. This
 * is what makes it safe to call from two independent triggers without a
 * separate lock.
 */
export async function applyMpesaPaymentOutcome(params: {
  checkoutRequestId: string
  resultCode: number
  resultDesc: string
  receiptNumber?: string
  rawCallback?: unknown
}): Promise<{ handled: boolean; status: 'completed' | 'failed' | 'unknown' }> {
  const success = params.resultCode === 0
  const newStatus: 'completed' | 'failed' = success ? 'completed' : 'failed'

  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .update({
      status: newStatus,
      provider_receipt_number: params.receiptNumber ?? null,
      failure_reason: success ? null : params.resultDesc,
      raw_callback: params.rawCallback ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_checkout_id', params.checkoutRequestId)
    .eq('status', 'pending')
    .select('id, invoice_id, amount')
    .maybeSingle()

  if (error) {
    console.error('Failed to update payment from M-Pesa result:', error)
    return { handled: false, status: 'unknown' }
  }

  // No row matched: either an unrecognized checkout ID, or this outcome was
  // already applied by a concurrent call — both are safe no-ops here.
  if (!payment) {
    return { handled: false, status: 'unknown' }
  }

  if (success && payment.invoice_id) {
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('total, amount_paid')
      .eq('id', payment.invoice_id)
      .single()

    if (invoice) {
      const newAmountPaid = invoice.amount_paid + payment.amount
      const fullyPaid = newAmountPaid >= invoice.total

      await supabaseAdmin
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          status: fullyPaid ? 'paid' : 'partial',
          paid_at: fullyPaid ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.invoice_id)
    }
  }

  return { handled: true, status: newStatus }
}

/**
 * How long after being marked failed a payment may still be re-queried by the
 * pollers. A failure can be recorded wrongly (e.g. a stale or out-of-order
 * callback) while Safaricom actually charged the customer; re-asking lets a
 * corroborated success repair it. Bounded because Daraja only answers STK
 * queries for a short time after the push, so older rows would just burn
 * query calls on every poll for an answer that won't change.
 */
export const FAILED_PAYMENT_REQUERY_WINDOW_MS = 30 * 60 * 1000

/**
 * Whether a poller should ask Safaricom about this row: pending rows always
 * (given a checkout id), failed rows only while recent. Completed rows are
 * final and never re-queried.
 */
export function shouldRequeryPayment(
  payment: { status: string; provider_checkout_id: string | null; updated_at?: string | null },
  now: number = Date.now()
): boolean {
  if (!payment.provider_checkout_id) return false
  if (payment.status === 'pending') return true
  if (payment.status !== 'failed' || !payment.updated_at) return false
  const updated = new Date(payment.updated_at).getTime()
  return Number.isFinite(updated) && now - updated <= FAILED_PAYMENT_REQUERY_WINDOW_MS
}

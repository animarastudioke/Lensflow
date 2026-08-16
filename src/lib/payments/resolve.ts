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
    .select('id, invoice_id, plan_id, order_id, amount, studio_id')
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

      const { data: updatedInvoice } = await supabaseAdmin
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          status: fullyPaid ? 'paid' : 'partial',
          paid_at: fullyPaid ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.invoice_id)
        .select('invoice_number')
        .single()

      const { createNotification } = await import('@/lib/actions/notifications')
      await createNotification(payment.studio_id, {
        type: 'payment_received',
        title: 'Payment received',
        body: updatedInvoice
          ? `KES ${payment.amount.toLocaleString()} via M-Pesa on ${updatedInvoice.invoice_number}`
          : `KES ${payment.amount.toLocaleString()} via M-Pesa`,
      })
    }
  }

  if (success && payment.plan_id) {
    const periodStart = new Date()
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000)

    await supabaseAdmin
      .from('subscriptions')
      .update({
        plan_id: payment.plan_id,
        status: 'active',
        billing_provider: 'mpesa',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq('studio_id', payment.studio_id)
      .in('status', ['active', 'trialing', 'past_due'])

    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('name')
      .eq('id', payment.plan_id)
      .single()

    const { createNotification } = await import('@/lib/actions/notifications')
    await createNotification(payment.studio_id, {
      type: 'payment_received',
      title: 'Subscription upgraded',
      body: plan ? `You're now on the ${plan.name} plan.` : 'Your subscription payment was received.',
    })
  }

  if (success && payment.order_id) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'delivered',
        payment_method: 'mpesa',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.order_id)
      .select('id, order_number, studio_id')
      .single()

    if (order) {
      // Sales stats are a display-only counter, not money — a read-then-write
      // race under concurrent orders for the same product is an acceptable
      // trade for not needing a dedicated RPC here.
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('product_id, quantity, total')
        .eq('order_id', order.id)

      for (const item of items ?? []) {
        if (!item.product_id) continue
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('sales_count, revenue')
          .eq('id', item.product_id)
          .single()
        if (product) {
          await supabaseAdmin
            .from('products')
            .update({
              sales_count: product.sales_count + item.quantity,
              revenue: Number(product.revenue) + Number(item.total),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.product_id)
        }
      }

      const { createNotification } = await import('@/lib/actions/notifications')
      await createNotification(order.studio_id, {
        type: 'payment_received',
        title: 'Order paid',
        body: `KES ${payment.amount.toLocaleString()} via M-Pesa on order ${order.order_number}`,
      })
    }
  }

  return { handled: true, status: newStatus }
}

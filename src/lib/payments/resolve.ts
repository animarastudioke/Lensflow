import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { paymentReceiptEmail } from '@/lib/email/templates'
import { APP_CONSTANTS } from '@/lib/constants'

async function getStudioBranding(studioId: string) {
  const { data: studio } = await supabaseAdmin
    .from('studios')
    .select('name, logo_url, brand_color')
    .eq('id', studioId)
    .single()
  return studio ? { name: studio.name, logoUrl: studio.logo_url, brandColor: studio.brand_color } : null
}

async function getStudioSlug(studioId: string): Promise<string | null> {
  const { data: studio } = await supabaseAdmin.from('studios').select('slug').eq('id', studioId).single()
  return studio?.slug ?? null
}

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
      .select('total, amount_paid, invoice_number, share_token, client:clients(name, email)')
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
      const studioSlug = await getStudioSlug(payment.studio_id)
      await createNotification(payment.studio_id, {
        type: 'payment_received',
        title: 'Payment received',
        body: updatedInvoice
          ? `KES ${payment.amount.toLocaleString()} via M-Pesa on ${updatedInvoice.invoice_number}`
          : `KES ${payment.amount.toLocaleString()} via M-Pesa`,
        link: studioSlug ? `/dashboard/${studioSlug}/invoices/${payment.invoice_id}` : undefined,
      })

      const client = invoice.client as unknown as { name: string; email: string } | null
      const studio = client?.email ? await getStudioBranding(payment.studio_id) : null
      if (client?.email && studio) {
        const appBase = APP_CONSTANTS.URL.replace(/\/$/, '')
        const { subject, html } = paymentReceiptEmail({
          studio,
          clientName: client.name,
          referenceNumber: invoice.invoice_number,
          amountKes: payment.amount,
          receiptNumber: params.receiptNumber,
          documentUrl: invoice.share_token ? `${appBase}/invoice/${invoice.share_token}` : null,
        })
        const result = await sendEmail({ to: client.email, subject, html })
        if (!result.success) console.error('Failed to send invoice payment receipt email:', result.error)
      }
    }
  }

  if (success && payment.plan_id) {
    const { data: newPlan } = await supabaseAdmin
      .from('plans')
      .select('name, price_cents')
      .eq('id', payment.plan_id)
      .single()

    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, current_period_end, plan:plans!subscriptions_plan_id_fkey(price_cents)')
      .eq('studio_id', payment.studio_id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const currentPriceCents = (existingSub?.plan as unknown as { price_cents: number } | null)?.price_cents ?? 0
    const stillWithinPaidPeriod = Boolean(
      existingSub?.current_period_end && new Date(existingSub.current_period_end) > new Date()
    )
    // A downgrade paid for while the current (higher) plan's period hasn't
    // ended yet is scheduled rather than applied immediately, so the studio
    // keeps what it already paid for - see pending_plan_id on subscriptions
    // and getEffectivePlan in src/lib/entitlements/service.ts.
    const isDowngrade = Boolean(newPlan) && newPlan!.price_cents < currentPriceCents && stillWithinPaidPeriod

    const { createNotification } = await import('@/lib/actions/notifications')

    if (isDowngrade && existingSub) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ pending_plan_id: payment.plan_id, updated_at: new Date().toISOString() })
        .eq('id', existingSub.id)

      await createNotification(payment.studio_id, {
        type: 'payment_received',
        title: 'Plan change scheduled',
        body: newPlan
          ? `You're switching to the ${newPlan.name} plan on ${new Date(existingSub.current_period_end as string).toLocaleDateString()}.`
          : 'Your subscription payment was received.',
      })
    } else {
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
          pending_plan_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('studio_id', payment.studio_id)
        .in('status', ['active', 'trialing', 'past_due'])

      await createNotification(payment.studio_id, {
        type: 'payment_received',
        title: 'Subscription upgraded',
        body: newPlan ? `You're now on the ${newPlan.name} plan.` : 'Your subscription payment was received.',
      })
    }
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
      .select('id, order_number, studio_id, email, share_token')
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

      const studio = order.email ? await getStudioBranding(order.studio_id) : null
      if (order.email && studio) {
        const appBase = APP_CONSTANTS.URL.replace(/\/$/, '')
        const { subject, html } = paymentReceiptEmail({
          studio,
          clientName: order.email,
          referenceNumber: order.order_number,
          amountKes: payment.amount,
          receiptNumber: params.receiptNumber,
          documentUrl: order.share_token ? `${appBase}/store/order/${order.share_token}` : null,
        })
        const result = await sendEmail({ to: order.email, subject, html })
        if (!result.success) console.error('Failed to send order payment receipt email:', result.error)
      }
    }
  }

  return { handled: true, status: newStatus }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { initiateStkPush, normalizeKenyanPhone, queryStkPushStatus, USD_TO_KES_RATE } from '@/lib/payments/mpesa'
import { applyMpesaPaymentOutcome } from '@/lib/payments/resolve'

async function requireOwnerMembership(): Promise<{ error: string } | { userId: string; studioId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return { error: 'No active studio membership' }
  if (membership.role !== 'studio_owner') return { error: 'Only the studio owner can change the subscription plan' }

  return { userId: user.id, studioId: membership.studio_id }
}

/**
 * Studio-pays-LensFlow subscription checkout via M-Pesa STK Push. Mirrors
 * initiateMpesaInvoicePayment's shape (same polling/webhook resolution
 * path in resolve.ts, branched there on payment.plan_id vs invoice_id)
 * rather than duplicating that machinery for a second payment type.
 */
export async function initiatePlanSubscriptionPayment(
  studioSlug: string,
  planSlug: 'starter' | 'studio' | 'team',
  phoneNumberInput: string
): Promise<{ paymentId: string; checkoutRequestId: string; customerMessage: string; amountKes: number } | { error: string }> {
  const membership = await requireOwnerMembership()
  if ('error' in membership) return membership

  const { data: plan } = await supabaseAdmin
    .from('plans')
    .select('id, name, price_cents, is_active')
    .eq('slug', planSlug)
    .single()

  if (!plan || !plan.is_active) return { error: 'Plan not found' }
  if (plan.price_cents <= 0) return { error: 'This plan has no charge to collect' }

  const phoneNumber = normalizeKenyanPhone(phoneNumberInput)
  if (!phoneNumber) {
    return { error: 'Enter a valid Kenyan phone number (e.g. 0712345678).' }
  }

  const { data: existingPending } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('studio_id', membership.studioId)
    .eq('plan_id', plan.id)
    .eq('status', 'pending')
    .eq('method', 'mpesa')
    .maybeSingle()

  if (existingPending) {
    return { error: 'A payment request is already pending for this plan. Wait for it to resolve, or check its status.' }
  }

  const amountKes = Math.round((plan.price_cents / 100) * USD_TO_KES_RATE)

  let stkResult
  try {
    stkResult = await initiateStkPush({
      phoneNumber,
      amount: amountKes,
      accountReference: `LensFlow ${plan.name}`,
      transactionDesc: 'Subscription',
    })
  } catch (err) {
    console.error('M-Pesa subscription STK push failed:', err)
    return { error: err instanceof Error ? err.message : 'Failed to reach M-Pesa. Try again.' }
  }

  const { data: payment, error: insertError } = await supabaseAdmin
    .from('payments')
    .insert({
      studio_id: membership.studioId,
      plan_id: plan.id,
      amount: amountKes,
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
    console.error('Failed to record pending subscription payment:', insertError)
    return { error: 'M-Pesa request was sent, but we failed to record it — contact support before retrying.' }
  }

  revalidatePath(`/dashboard/${studioSlug}/settings`)

  return {
    paymentId: payment.id,
    checkoutRequestId: stkResult.checkoutRequestId,
    customerMessage: stkResult.customerMessage,
    amountKes,
  }
}

export interface SubscriptionPaymentStatus {
  status: 'pending' | 'completed' | 'failed'
  failureReason: string | null
}

export async function pollPlanSubscriptionPaymentStatus(
  paymentId: string,
  studioSlug: string
): Promise<SubscriptionPaymentStatus | { error: string }> {
  const membership = await requireOwnerMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { data: payment } = await supabase
    .from('payments')
    .select('status, provider_checkout_id, failure_reason')
    .eq('id', paymentId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!payment) return { error: 'Payment not found' }

  if (payment.status !== 'pending') {
    return { status: payment.status as 'completed' | 'failed', failureReason: payment.failure_reason }
  }

  if (!payment.provider_checkout_id) {
    return { status: 'pending', failureReason: null }
  }

  const queryResult = await queryStkPushStatus(payment.provider_checkout_id).catch((err) => {
    console.error('M-Pesa subscription status query failed:', err)
    return { status: 'pending' as const, resultDesc: '' }
  })

  if (queryResult.status === 'pending') {
    return { status: 'pending', failureReason: null }
  }

  const outcome = await applyMpesaPaymentOutcome({
    checkoutRequestId: payment.provider_checkout_id,
    resultCode: queryResult.status === 'completed' ? 0 : 1,
    resultDesc: queryResult.resultDesc,
  })

  revalidatePath(`/dashboard/${studioSlug}/settings`)

  return {
    status: outcome.status === 'unknown' ? 'pending' : outcome.status,
    failureReason: outcome.status === 'failed' ? queryResult.resultDesc : null,
  }
}

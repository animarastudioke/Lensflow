'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudioPermission } from '@/lib/auth/server'
import { getEffectivePlan, getStorageUsage, getSubscriptionAccessState } from '@/lib/entitlements'
import type { Plan, StorageUsage, SubscriptionAccessState } from '@/lib/entitlements'

export interface SubscriptionInfo {
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  billingProvider: string | null
  pendingPlanName: string | null
}

export async function getStudioBillingOverview(
  studioSlug: string
): Promise<{ plan: Plan; storage: StorageUsage; subscription: SubscriptionInfo | null; accessState: SubscriptionAccessState; graceEndsAt: string | null } | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  const [plan, storage, access, { data: subscriptionRow }] = await Promise.all([
    getEffectivePlan(studio.id),
    getStorageUsage(studio.id),
    getSubscriptionAccessState(studio.id),
    supabase
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end, billing_provider, pending_plan:plans!subscriptions_pending_plan_id_fkey(name)')
      .eq('studio_id', studio.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const subscription: SubscriptionInfo | null = subscriptionRow
    ? {
        status: subscriptionRow.status,
        currentPeriodEnd: subscriptionRow.current_period_end,
        cancelAtPeriodEnd: subscriptionRow.cancel_at_period_end,
        billingProvider: subscriptionRow.billing_provider,
        pendingPlanName: (subscriptionRow.pending_plan as unknown as { name: string } | null)?.name ?? null,
      }
    : null

  return { plan, storage, subscription, accessState: access.state, graceEndsAt: access.graceEndsAt }
}

export interface SubscriptionPaymentRow {
  id: string
  planName: string | null
  amount: number
  currency: string
  status: string
  createdAt: string
  receiptNumber: string | null
}

export async function getSubscriptionPaymentHistory(_studioSlug: string): Promise<SubscriptionPaymentRow[]> {
  const membership = await requireStudioPermission('payments:read')
  if ('error' in membership) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, currency, status, created_at, provider_receipt_number, plan:plans(name)')
    .eq('studio_id', membership.studioId)
    .not('plan_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data) return []

  return data.map((p) => ({
    id: p.id,
    planName: (p.plan as unknown as { name: string } | null)?.name ?? null,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    createdAt: p.created_at,
    receiptNumber: p.provider_receipt_number,
  }))
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { getEffectivePlan, getStorageUsage } from '@/lib/entitlements'
import type { Plan, StorageUsage } from '@/lib/entitlements'

export interface SubscriptionInfo {
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  billingProvider: string | null
}

export async function getStudioBillingOverview(
  studioSlug: string
): Promise<{ plan: Plan; storage: StorageUsage; subscription: SubscriptionInfo | null } | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  const [plan, storage, { data: subscriptionRow }] = await Promise.all([
    getEffectivePlan(studio.id),
    getStorageUsage(studio.id),
    supabase
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end, billing_provider')
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
      }
    : null

  return { plan, storage, subscription }
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

export async function getSubscriptionPaymentHistory(studioSlug: string): Promise<SubscriptionPaymentRow[]> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id').eq('slug', studioSlug).single()
  if (!studio) return []

  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, currency, status, created_at, provider_receipt_number, plan:plans(name)')
    .eq('studio_id', studio.id)
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

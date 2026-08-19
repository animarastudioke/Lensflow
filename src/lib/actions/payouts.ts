'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface PayoutRow {
  id: string
  amount: number
  currency: string
  method: string
  reference: string | null
  note: string | null
  createdAt: string
}

export interface StudioPayoutSummary {
  currency: string
  totalCollected: number
  totalPaidOut: number
  owed: number
  payouts: PayoutRow[]
}

// "Collected" is every completed client payment held for this studio — an
// invoice or a store order, never a subscription payment (plan_id), which
// runs the other direction (studio paying the platform). See resolve.ts's
// invoice_id/order_id/plan_id branches, the same distinction this mirrors.
export async function getStudioPayoutSummary(studioSlug: string): Promise<StudioPayoutSummary | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id, currency').eq('slug', studioSlug).single()
  if (!studio) return null

  const [{ data: collectedRows }, { data: payoutRows }] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, currency')
      .eq('studio_id', studio.id)
      .eq('status', 'completed')
      .or('invoice_id.not.is.null,order_id.not.is.null'),
    supabase
      .from('payouts')
      .select('id, amount, currency, method, reference, note, created_at')
      .eq('studio_id', studio.id)
      .order('created_at', { ascending: false }),
  ])

  // Client payments only ever settle in KES today (M-Pesa's only currency —
  // see USD_TO_KES_RATE in mpesa.ts), so the ledger is scoped to KES
  // regardless of the studio's own billing currency.
  const totalCollected = (collectedRows ?? [])
    .filter((p) => p.currency === 'KES')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const payouts: PayoutRow[] = (payoutRows ?? []).map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    currency: p.currency,
    method: p.method,
    reference: p.reference,
    note: p.note,
    createdAt: p.created_at,
  }))

  const totalPaidOut = payouts
    .filter((p) => p.currency === 'KES')
    .reduce((sum, p) => sum + p.amount, 0)

  return {
    currency: 'KES',
    totalCollected,
    totalPaidOut,
    owed: Math.max(totalCollected - totalPaidOut, 0),
    payouts,
  }
}

async function requireSuperAdmin(): Promise<{ error: string } | { userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: 'Only platform admins can manage payouts' }

  return { userId: user.id }
}

export interface AdminPayoutStudioRow {
  studioId: string
  studioSlug: string
  studioName: string
  ownerEmail: string | null
  currency: string
  totalCollected: number
  totalPaidOut: number
  owed: number
}

/** Admin-only: every studio with at least one completed client payment, ranked by what's still owed. */
export async function getAllStudioPayoutBalances(): Promise<AdminPayoutStudioRow[] | { error: string }> {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return auth

  const [{ data: studios }, { data: collectedRows }, { data: payoutRows }] = await Promise.all([
    supabaseAdmin.from('studios').select('id, slug, name, email'),
    supabaseAdmin
      .from('payments')
      .select('studio_id, amount, currency')
      .eq('status', 'completed')
      .or('invoice_id.not.is.null,order_id.not.is.null')
      .eq('currency', 'KES'),
    supabaseAdmin.from('payouts').select('studio_id, amount, currency').eq('currency', 'KES'),
  ])

  const collectedByStudio = new Map<string, number>()
  for (const row of collectedRows ?? []) {
    collectedByStudio.set(row.studio_id, (collectedByStudio.get(row.studio_id) ?? 0) + Number(row.amount))
  }

  const paidOutByStudio = new Map<string, number>()
  for (const row of payoutRows ?? []) {
    paidOutByStudio.set(row.studio_id, (paidOutByStudio.get(row.studio_id) ?? 0) + Number(row.amount))
  }

  return (studios ?? [])
    .map((studio) => {
      const totalCollected = collectedByStudio.get(studio.id) ?? 0
      const totalPaidOut = paidOutByStudio.get(studio.id) ?? 0
      return {
        studioId: studio.id,
        studioSlug: studio.slug,
        studioName: studio.name,
        ownerEmail: studio.email,
        currency: 'KES',
        totalCollected,
        totalPaidOut,
        owed: Math.max(totalCollected - totalPaidOut, 0),
      }
    })
    .filter((row) => row.totalCollected > 0)
    .sort((a, b) => b.owed - a.owed)
}

export async function recordPayout(
  studioId: string,
  amount: number,
  note: string,
  reference: string
): Promise<{ error: string } | { success: true }> {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return auth

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Enter an amount greater than 0' }
  }

  const { error } = await supabaseAdmin.from('payouts').insert({
    studio_id: studioId,
    amount,
    currency: 'KES',
    method: 'manual',
    reference: reference || null,
    note: note || null,
    recorded_by: auth.userId,
  })

  if (error) {
    console.error('Record payout error:', error)
    return { error: 'Failed to record payout' }
  }

  revalidatePath('/admin/payouts')
  return { success: true }
}

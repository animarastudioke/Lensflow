'use server'

import { createClient } from '@/lib/supabase/server'
import { getEffectivePlan, getStorageUsage } from '@/lib/entitlements'
import type { Plan, StorageUsage } from '@/lib/entitlements'

export async function getStudioBillingOverview(
  studioSlug: string
): Promise<{ plan: Plan; storage: StorageUsage } | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  const [plan, storage] = await Promise.all([
    getEffectivePlan(studio.id),
    getStorageUsage(studio.id),
  ])

  return { plan, storage }
}

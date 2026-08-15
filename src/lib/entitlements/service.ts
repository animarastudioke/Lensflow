import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  ENTITLED_SUBSCRIPTION_STATUSES,
  getStorageStatus,
  planHasEntitlement,
  resolveSubscriptionAccessState,
  type EntitlementKey,
  type Plan,
  type StorageUsage,
  type SubscriptionAccessState,
} from './types'

export { getStorageStatus }

// Centralized plan/entitlement resolution. Nothing outside this module
// should query `plans`/`subscriptions` directly or branch on a plan slug —
// callers ask `hasEntitlement(studioId, 'store')`, never
// `if (plan === 'studio' || plan === 'team')`. This is also the one place
// that decides what "effective plan" means, so swapping the billing
// provider or changing how a past-due subscription degrades only requires
// editing this file.
//
// Uses the service-role client rather than the request-scoped RLS client:
// this service is itself the trust boundary (it makes its own authorization
// decision from studio_id), and it must work identically whether the caller
// is an authenticated studio member or an anonymous public-gallery visitor
// (whose access is gated by the *studio's* plan, not their own identity).

interface PlanRow {
  id: string
  slug: string
  name: string
  price_cents: number
  currency: string
  billing_interval: string
  storage_limit_bytes: string | number
  max_active_galleries: number | null
  max_team_seats: number | null
  can_download_originals: boolean
  can_bulk_download: boolean
  can_use_store: boolean
  can_use_website_builder: boolean
  can_use_custom_domain: boolean
  can_accept_payments: boolean
  can_use_booking: boolean
  can_use_crm: boolean
  priority_support: boolean
  show_powered_by_badge: boolean
}

function mapPlanRow(row: PlanRow): Plan {
  return {
    id: row.id,
    slug: row.slug as Plan['slug'],
    name: row.name,
    priceCents: row.price_cents,
    currency: row.currency,
    billingInterval: row.billing_interval,
    // bigint comes back from postgres as a string in JS — parse explicitly,
    // never treat it as an already-safe float.
    storageLimitBytes: typeof row.storage_limit_bytes === 'string'
      ? Number.parseInt(row.storage_limit_bytes, 10)
      : row.storage_limit_bytes,
    maxActiveGalleries: row.max_active_galleries,
    maxTeamSeats: row.max_team_seats,
    canDownloadOriginals: row.can_download_originals,
    canBulkDownload: row.can_bulk_download,
    canUseStore: row.can_use_store,
    canUseWebsiteBuilder: row.can_use_website_builder,
    canUseCustomDomain: row.can_use_custom_domain,
    canAcceptPayments: row.can_accept_payments,
    canUseBooking: row.can_use_booking,
    canUseCrm: row.can_use_crm,
    prioritySupport: row.priority_support,
    showPoweredByBadge: row.show_powered_by_badge,
  }
}

let freePlanCache: Plan | null = null

async function getFreePlan(): Promise<Plan> {
  if (freePlanCache) return freePlanCache
  const { data, error } = await supabaseAdmin
    .from('plans')
    .select('*')
    .eq('slug', 'free')
    .single()
  if (error || !data) {
    throw new Error('Free plan is not configured — run the plan_entitlements migration')
  }
  freePlanCache = mapPlanRow(data as PlanRow)
  return freePlanCache
}

/**
 * Resolves the plan a studio actually gets right now. A studio that
 * selected Starter but whose payment is past_due/canceled/expired does NOT
 * get Starter entitlements — paid access requires a currently-valid
 * subscription state, so this falls back to Free rather than trusting
 * whatever plan_id is on file.
 *
 * A paid period that has run past its current_period_end still resolves to
 * the paid plan while inside the grace window (see
 * SUBSCRIPTION_GRACE_PERIOD_DAYS) — viewing/downloads keep working during
 * grace, matching how a lapsed-but-not-yet-expired subscription should
 * behave. Only new uploads are blocked during grace, which is enforced
 * separately in reserveUploadQuota via getSubscriptionAccessState, since
 * that's a narrower restriction than losing the plan's features outright.
 */
export async function getEffectivePlan(studioId: string): Promise<Plan> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end, plan:plans(*)')
    .eq('studio_id', studioId)
    .in('status', ['active', 'trialing', 'past_due', 'incomplete'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data || !data.plan) {
    return getFreePlan()
  }

  const status = data.status as string
  if (!ENTITLED_SUBSCRIPTION_STATUSES.includes(status as (typeof ENTITLED_SUBSCRIPTION_STATUSES)[number])) {
    // past_due / incomplete: subscription exists but isn't currently paid up.
    return getFreePlan()
  }

  if (resolveSubscriptionAccessState(data.current_period_end as string | null).state === 'expired') {
    return getFreePlan()
  }

  return mapPlanRow(data.plan as unknown as PlanRow)
}

export interface SubscriptionAccess {
  state: SubscriptionAccessState
  periodEnd: string | null
  graceEndsAt: string | null
}

/**
 * Finer-grained than getEffectivePlan: distinguishes "still within the paid
 * period" from "past it but inside the grace window" from "fully expired,"
 * for the one thing that's restricted during grace but not before it — new
 * uploads. Free-plan subscriptions have no current_period_end and are
 * always 'active' here (nothing to expire).
 */
export async function getSubscriptionAccessState(studioId: string): Promise<SubscriptionAccess> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('studio_id', studioId)
    .in('status', ['active', 'trialing', 'past_due', 'incomplete'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const periodEnd = (data?.current_period_end as string | null) ?? null
  const resolved = resolveSubscriptionAccessState(periodEnd)
  return { state: resolved.state, periodEnd, graceEndsAt: resolved.graceEndsAt }
}

export async function hasEntitlement(studioId: string, key: EntitlementKey): Promise<boolean> {
  const plan = await getEffectivePlan(studioId)
  return planHasEntitlement(plan, key)
}

/** Throws if the studio's effective plan doesn't include this entitlement. Matches this codebase's existing convention of server actions throwing plain Errors on failure. */
export async function requireEntitlement(studioId: string, key: EntitlementKey): Promise<Plan> {
  const plan = await getEffectivePlan(studioId)
  if (!planHasEntitlement(plan, key)) {
    throw new Error(`This feature requires an upgraded plan. Your current plan (${plan.name}) doesn't include it.`)
  }
  return plan
}

export async function getStorageUsageBytes(studioId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('studio_storage_usage')
    .select('used_bytes')
    .eq('studio_id', studioId)
    .maybeSingle()
  if (error || !data) return 0
  const raw = data.used_bytes as string | number
  return typeof raw === 'string' ? Number.parseInt(raw, 10) : raw
}

export async function getStorageUsage(studioId: string): Promise<StorageUsage> {
  const [plan, usedBytes] = await Promise.all([
    getEffectivePlan(studioId),
    getStorageUsageBytes(studioId),
  ])
  const limitBytes = plan.storageLimitBytes
  return {
    usedBytes,
    limitBytes,
    percentUsed: limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 100,
    status: getStorageStatus(usedBytes, limitBytes),
  }
}

/**
 * Server-side-authoritative upload gate: `used + requested <= limit`. Never
 * trust a client-reported "I'm under quota" — this must be checked again
 * here, right before issuing a presigned upload URL.
 */
export async function canAcceptUpload(
  studioId: string,
  requestedBytes: number
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const access = await getSubscriptionAccessState(studioId)
  if (access.state !== 'active') {
    return {
      allowed: false,
      reason: access.state === 'grace'
        ? 'Your subscription period has ended and is in its grace window — new uploads are paused until you renew.'
        : 'Your subscription has expired and this studio is back on the Free plan.',
    }
  }

  const usage = await getStorageUsage(studioId)
  if (usage.status === 'over_quota') {
    return {
      allowed: false,
      reason: 'This studio is over its storage limit. Upgrade your plan or free up space before uploading more.',
    }
  }
  if (usage.usedBytes + requestedBytes > usage.limitBytes) {
    return {
      allowed: false,
      reason: 'This upload would exceed your plan\'s storage limit. Upgrade your plan or free up space.',
    }
  }
  return { allowed: true }
}

/**
 * Concurrency-safe replacement for the read-then-decide check in
 * canAcceptUpload: reserves `requestedBytes` against the studio's quota as
 * one atomic database operation (an advisory-locked transaction — see
 * migration 021), so two simultaneous near-the-limit uploads can't both
 * read "under quota" and both proceed. Call this right before issuing a
 * presigned upload URL; release the reservation via
 * releaseUploadReservations() once the upload is finalized or abandoned.
 */
export async function reserveUploadQuota(
  studioId: string,
  mediaId: string,
  requestedBytes: number
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const access = await getSubscriptionAccessState(studioId)
  if (access.state === 'grace') {
    return {
      allowed: false,
      reason: 'Your subscription period has ended and is in its grace window — existing galleries stay available, but new uploads are paused until you renew.',
    }
  }
  if (access.state === 'expired') {
    return {
      allowed: false,
      reason: 'Your subscription has expired and this studio is back on the Free plan. Renew to resume uploading at your previous plan\'s limits.',
    }
  }

  const plan = await getEffectivePlan(studioId)

  const { data, error } = await supabaseAdmin
    .rpc('reserve_upload_quota', {
      p_studio_id: studioId,
      p_media_id: mediaId,
      p_bytes: requestedBytes,
      p_limit_bytes: plan.storageLimitBytes,
    })
    .single()

  if (error || !data) {
    console.error('reserve_upload_quota RPC failed:', error)
    return { allowed: false, reason: 'Could not verify storage quota. Try again.' }
  }

  const result = data as { allowed: boolean }
  if (!result.allowed) {
    return {
      allowed: false,
      reason: 'This upload would exceed your plan\'s storage limit. Upgrade your plan or free up space.',
    }
  }
  return { allowed: true }
}

/** Releases in-flight upload reservations once finalized (now counted for real) or abandoned. */
export async function releaseUploadReservations(mediaIds: string[]): Promise<void> {
  if (mediaIds.length === 0) return
  const { error } = await supabaseAdmin.rpc('release_upload_reservations', { p_media_ids: mediaIds })
  if (error) console.error('release_upload_reservations RPC failed:', error)
}

/**
 * Free-tier gallery-count ceiling (and any future plan that sets a limit).
 * `activeStatuses` mirrors how "active" is defined elsewhere in this app —
 * anything not archived/deleted.
 */
export async function canCreateGallery(
  studioId: string
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const plan = await getEffectivePlan(studioId)
  if (plan.maxActiveGalleries === null) return { allowed: true }

  const { count, error } = await supabaseAdmin
    .from('galleries')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .neq('status', 'archived')

  if (error) return { allowed: true } // fail open on a read error rather than blocking gallery creation

  if ((count ?? 0) >= plan.maxActiveGalleries) {
    return {
      allowed: false,
      reason: `The ${plan.name} plan allows up to ${plan.maxActiveGalleries} active ${plan.maxActiveGalleries === 1 ? 'gallery' : 'galleries'}. Upgrade to create more.`,
    }
  }
  return { allowed: true }
}

export async function canAddTeamSeat(
  studioId: string
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const plan = await getEffectivePlan(studioId)
  if (plan.maxTeamSeats === null) return { allowed: true }

  const { count, error } = await supabaseAdmin
    .from('studio_members')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .in('status', ['active', 'invited'])

  if (error) return { allowed: true }

  if ((count ?? 0) >= plan.maxTeamSeats) {
    return {
      allowed: false,
      reason: `The ${plan.name} plan includes ${plan.maxTeamSeats} team ${plan.maxTeamSeats === 1 ? 'seat' : 'seats'}. Upgrade to add more people.`,
    }
  }
  return { allowed: true }
}

export { getFreePlan }

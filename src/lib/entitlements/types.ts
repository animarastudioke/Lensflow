export type PlanSlug = 'free' | 'starter' | 'studio' | 'team'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'incomplete'

/** Subscription states that grant the studio's paid entitlements. */
export const ENTITLED_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = ['active', 'trialing']

export interface Plan {
  id: string
  slug: PlanSlug
  name: string
  priceCents: number
  currency: string
  billingInterval: string
  storageLimitBytes: number
  maxActiveGalleries: number | null
  maxTeamSeats: number | null
  canDownloadOriginals: boolean
  canBulkDownload: boolean
  canUseStore: boolean
  canUseWebsiteBuilder: boolean
  canUseCustomDomain: boolean
  canAcceptPayments: boolean
  canUseBooking: boolean
  canUseCrm: boolean
  prioritySupport: boolean
  showPoweredByBadge: boolean
}

/** Boolean feature flags on Plan, addressable by a stable string key. */
export const ENTITLEMENT_KEYS = [
  'original_download',
  'bulk_download',
  'store',
  'website_builder',
  'custom_domain',
  'payments',
  'booking',
  'crm',
  'priority_support',
] as const

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number]

const ENTITLEMENT_TO_PLAN_FIELD: Record<EntitlementKey, keyof Plan> = {
  original_download: 'canDownloadOriginals',
  bulk_download: 'canBulkDownload',
  store: 'canUseStore',
  website_builder: 'canUseWebsiteBuilder',
  custom_domain: 'canUseCustomDomain',
  payments: 'canAcceptPayments',
  booking: 'canUseBooking',
  crm: 'canUseCrm',
  priority_support: 'prioritySupport',
}

export function planHasEntitlement(plan: Plan, key: EntitlementKey): boolean {
  return Boolean(plan[ENTITLEMENT_TO_PLAN_FIELD[key]])
}

export interface Subscription {
  id: string
  studioId: string
  planId: string
  status: SubscriptionStatus
  billingProvider: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  trialEndsAt: string | null
}

export type StorageStatus = 'ok' | 'warning' | 'critical' | 'over_quota'

export interface StorageUsage {
  usedBytes: number
  limitBytes: number
  percentUsed: number
  status: StorageStatus
}

/**
 * Percent-of-limit thresholds for storage warnings. Configurable in one
 * place rather than hard-coded into UI components (per product spec).
 */
export const STORAGE_THRESHOLDS = {
  warning: 0.7,
  strong: 0.85,
  critical: 0.95,
  blocked: 1.0,
} as const

/**
 * Pure threshold logic, deliberately kept dependency-free (no Supabase
 * client import) so it can be unit tested without any environment/network
 * setup — see tests/unit/entitlements.test.ts.
 */
export function getStorageStatus(usedBytes: number, limitBytes: number): StorageStatus {
  if (limitBytes <= 0) return 'over_quota'
  const ratio = usedBytes / limitBytes
  if (ratio >= STORAGE_THRESHOLDS.blocked) return 'over_quota'
  if (ratio >= STORAGE_THRESHOLDS.critical) return 'critical'
  if (ratio >= STORAGE_THRESHOLDS.warning) return 'warning'
  return 'ok'
}

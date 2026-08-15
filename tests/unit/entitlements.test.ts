import { describe, expect, it } from 'vitest'
import {
  getStorageStatus,
  planHasEntitlement,
  resolveSubscriptionAccessState,
  SUBSCRIPTION_GRACE_PERIOD_DAYS,
  type Plan,
} from '@/lib/entitlements/types'

describe('getStorageStatus', () => {
  it('is ok well under every threshold', () => {
    expect(getStorageStatus(0, 1000)).toBe('ok')
    expect(getStorageStatus(699, 1000)).toBe('ok')
  })

  it('flips to warning at exactly the 70% threshold', () => {
    expect(getStorageStatus(700, 1000)).toBe('warning')
    expect(getStorageStatus(949, 1000)).toBe('warning')
  })

  it('flips to critical at exactly the 95% threshold', () => {
    expect(getStorageStatus(950, 1000)).toBe('critical')
    expect(getStorageStatus(999, 1000)).toBe('critical')
  })

  it('is over_quota at 100% and beyond', () => {
    expect(getStorageStatus(1000, 1000)).toBe('over_quota')
    expect(getStorageStatus(1500, 1000)).toBe('over_quota')
  })

  it('treats a non-positive limit as over_quota rather than dividing by zero', () => {
    expect(getStorageStatus(0, 0)).toBe('over_quota')
    expect(getStorageStatus(5, -1)).toBe('over_quota')
  })

  it('reflects a downgrade scenario: usage carried over, new limit exceeded', () => {
    // Team studio used 700GB, downgrades to Starter's 50GB limit.
    const usedBytes = 700 * 1024 ** 3
    const starterLimitBytes = 50 * 1024 ** 3
    expect(getStorageStatus(usedBytes, starterLimitBytes)).toBe('over_quota')
  })
})

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-id',
    slug: 'free',
    name: 'Free',
    priceCents: 0,
    currency: 'USD',
    billingInterval: 'month',
    storageLimitBytes: 3 * 1024 ** 3,
    maxActiveGalleries: 1,
    maxTeamSeats: 1,
    canDownloadOriginals: false,
    canBulkDownload: false,
    canUseStore: false,
    canUseWebsiteBuilder: false,
    canUseCustomDomain: false,
    canAcceptPayments: false,
    canUseBooking: false,
    canUseCrm: false,
    prioritySupport: false,
    showPoweredByBadge: true,
    ...overrides,
  }
}

describe('planHasEntitlement', () => {
  it('reflects the Free plan: everything gated except viewing/favorites (no boolean flag needed for those)', () => {
    const free = makePlan()
    expect(planHasEntitlement(free, 'original_download')).toBe(false)
    expect(planHasEntitlement(free, 'bulk_download')).toBe(false)
    expect(planHasEntitlement(free, 'store')).toBe(false)
    expect(planHasEntitlement(free, 'website_builder')).toBe(false)
    expect(planHasEntitlement(free, 'custom_domain')).toBe(false)
    expect(planHasEntitlement(free, 'payments')).toBe(false)
    expect(planHasEntitlement(free, 'booking')).toBe(false)
    expect(planHasEntitlement(free, 'crm')).toBe(false)
    expect(planHasEntitlement(free, 'priority_support')).toBe(false)
  })

  it('reflects the Starter plan: downloads/booking/CRM/payments, no store/website/team', () => {
    const starter = makePlan({
      slug: 'starter',
      canDownloadOriginals: true,
      canBulkDownload: true,
      canAcceptPayments: true,
      canUseBooking: true,
      canUseCrm: true,
    })
    expect(planHasEntitlement(starter, 'original_download')).toBe(true)
    expect(planHasEntitlement(starter, 'bulk_download')).toBe(true)
    expect(planHasEntitlement(starter, 'store')).toBe(false)
    expect(planHasEntitlement(starter, 'website_builder')).toBe(false)
  })

  it('reflects the Studio plan inheriting Starter plus store/website/custom domain', () => {
    const studio = makePlan({
      slug: 'studio',
      canDownloadOriginals: true,
      canBulkDownload: true,
      canUseStore: true,
      canUseWebsiteBuilder: true,
      canUseCustomDomain: true,
      canAcceptPayments: true,
      canUseBooking: true,
      canUseCrm: true,
    })
    expect(planHasEntitlement(studio, 'store')).toBe(true)
    expect(planHasEntitlement(studio, 'website_builder')).toBe(true)
    expect(planHasEntitlement(studio, 'custom_domain')).toBe(true)
    expect(planHasEntitlement(studio, 'priority_support')).toBe(false)
  })

  it('reflects the Team plan adding priority support on top of everything Studio has', () => {
    const team = makePlan({ slug: 'team', prioritySupport: true })
    expect(planHasEntitlement(team, 'priority_support')).toBe(true)
  })
})

describe('resolveSubscriptionAccessState', () => {
  const DAY_MS = 24 * 60 * 60 * 1000

  it('is always active with no period end (the Free plan never expires)', () => {
    expect(resolveSubscriptionAccessState(null).state).toBe('active')
    expect(resolveSubscriptionAccessState(null).graceEndsAt).toBeNull()
  })

  it('is active right up to and including the period end', () => {
    const now = new Date('2026-06-15T12:00:00Z')
    const periodEnd = new Date('2026-06-15T12:00:00Z').toISOString()
    expect(resolveSubscriptionAccessState(periodEnd, now).state).toBe('active')

    const stillActive = new Date('2026-06-14T00:00:00Z')
    expect(resolveSubscriptionAccessState(periodEnd, stillActive).state).toBe('active')
  })

  it('enters grace the moment the period end passes', () => {
    const periodEnd = new Date('2026-06-15T00:00:00Z').toISOString()
    const justAfter = new Date('2026-06-15T00:00:01Z')
    expect(resolveSubscriptionAccessState(periodEnd, justAfter).state).toBe('grace')
  })

  it('stays in grace right up through the configured grace window', () => {
    const periodEnd = new Date('2026-06-15T00:00:00Z').toISOString()
    const lastGraceMoment = new Date(new Date(periodEnd).getTime() + SUBSCRIPTION_GRACE_PERIOD_DAYS * DAY_MS)
    expect(resolveSubscriptionAccessState(periodEnd, lastGraceMoment).state).toBe('grace')
  })

  it('expires the moment the grace window passes', () => {
    const periodEnd = new Date('2026-06-15T00:00:00Z').toISOString()
    const justPastGrace = new Date(new Date(periodEnd).getTime() + SUBSCRIPTION_GRACE_PERIOD_DAYS * DAY_MS + 1000)
    expect(resolveSubscriptionAccessState(periodEnd, justPastGrace).state).toBe('expired')
  })

  it('computes graceEndsAt as exactly periodEnd + the grace window, for both active and grace states', () => {
    const periodEnd = new Date('2026-06-15T00:00:00Z')
    const expectedGraceEndsAt = new Date(periodEnd.getTime() + SUBSCRIPTION_GRACE_PERIOD_DAYS * DAY_MS).toISOString()

    expect(resolveSubscriptionAccessState(periodEnd.toISOString(), periodEnd).graceEndsAt).toBe(expectedGraceEndsAt)
    expect(
      resolveSubscriptionAccessState(periodEnd.toISOString(), new Date(periodEnd.getTime() + DAY_MS)).graceEndsAt
    ).toBe(expectedGraceEndsAt)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'

// getEffectivePlan/getSubscriptionAccessState hit supabaseAdmin directly, so
// the real module (which throws at import time without service-role env
// vars) is replaced before src/lib/entitlements/service is ever imported.
// The mock is a minimal fluent builder: `select(...)` chains resolve via
// maybeSingle()/single(), `update(...)` chains are awaited directly (no
// terminal call), matching exactly how service.ts uses each.
const state: {
  subscriptionResult: { data: unknown; error: unknown }
  planByIdResult: { data: unknown; error: unknown }
  updateCalls: Array<{ table: string; payload: Record<string, unknown> }>
} = {
  subscriptionResult: { data: null, error: null },
  planByIdResult: { data: null, error: null },
  updateCalls: [],
}

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from(table: string) {
      const builder: {
        select: (...args: unknown[]) => typeof builder
        update: (payload: Record<string, unknown>) => typeof builder
        insert: (...args: unknown[]) => typeof builder
        eq: (...args: unknown[]) => typeof builder
        in: (...args: unknown[]) => typeof builder
        order: (...args: unknown[]) => typeof builder
        limit: (...args: unknown[]) => typeof builder
        maybeSingle: () => Promise<unknown>
        single: () => Promise<unknown>
        then: (resolve: (v: unknown) => void) => void
      } = {
        select: () => builder,
        update: (payload: Record<string, unknown>) => {
          state.updateCalls.push({ table, payload })
          // Mirrors real DB write-then-read consistency: a later select on
          // this table within the same test should see this update applied,
          // exactly like getSubscriptionAccessState's second read does after
          // getEffectivePlan's materialization write.
          if (table === 'subscriptions' && state.subscriptionResult.data && typeof state.subscriptionResult.data === 'object') {
            Object.assign(state.subscriptionResult.data as Record<string, unknown>, payload)
          }
          return builder
        },
        insert: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () =>
          Promise.resolve(table === 'plans' ? state.planByIdResult : state.subscriptionResult),
        single: () =>
          Promise.resolve(table === 'plans' ? state.planByIdResult : state.subscriptionResult),
        // Supports `await supabaseAdmin.from(...).update(...).eq(...).eq(...)`
        // with no terminal call, exactly how materializeDuePendingDowngrade
        // issues its update.
        then: (resolve) => resolve({ data: null, error: null }),
      }
      return builder
    },
  },
}))

const { getEffectivePlan, getSubscriptionAccessState } = await import('@/lib/entitlements/service')

function planRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-free',
    slug: 'free',
    name: 'Free',
    price_cents: 0,
    currency: 'USD',
    billing_interval: 'month',
    storage_limit_bytes: 3 * 1024 ** 3,
    max_active_galleries: 1,
    max_team_seats: 1,
    can_download_originals: false,
    can_bulk_download: false,
    can_use_store: false,
    can_use_website_builder: false,
    can_use_custom_domain: false,
    can_accept_payments: false,
    can_use_booking: false,
    can_use_crm: false,
    priority_support: false,
    show_powered_by_badge: true,
    ...overrides,
  }
}

afterEach(() => {
  state.subscriptionResult = { data: null, error: null }
  state.planByIdResult = { data: null, error: null }
  state.updateCalls = []
})

describe('getEffectivePlan', () => {
  it('falls back to Free when the studio has no subscription row', async () => {
    state.subscriptionResult = { data: null, error: null }
    state.planByIdResult = { data: planRow(), error: null }

    const plan = await getEffectivePlan('studio-1')
    expect(plan.slug).toBe('free')
  })

  it('returns the current plan while still within the paid period, ignoring any pending downgrade', async () => {
    const farFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    state.subscriptionResult = {
      data: {
        status: 'active',
        current_period_end: farFuture,
        pending_plan_id: 'plan-starter',
        plan: planRow({ id: 'plan-studio', slug: 'studio', name: 'Studio', price_cents: 2900, storage_limit_bytes: 500 * 1024 ** 3 }),
      },
      error: null,
    }

    const plan = await getEffectivePlan('studio-1')
    expect(plan.slug).toBe('studio')
    expect(state.updateCalls).toHaveLength(0)
  })

  it('materializes a due pending downgrade: returns the pending plan and writes plan_id/pending_plan_id/period', async () => {
    const pastPeriodEnd = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    state.subscriptionResult = {
      data: {
        status: 'active',
        current_period_end: pastPeriodEnd,
        pending_plan_id: 'plan-starter',
        plan: planRow({ id: 'plan-studio', slug: 'studio', name: 'Studio', price_cents: 2900 }),
      },
      error: null,
    }
    state.planByIdResult = {
      data: planRow({ id: 'plan-starter', slug: 'starter', name: 'Starter', price_cents: 1200, storage_limit_bytes: 100 * 1024 ** 3 }),
      error: null,
    }

    const plan = await getEffectivePlan('studio-1')
    expect(plan.slug).toBe('starter')

    expect(state.updateCalls).toHaveLength(1)
    const update = state.updateCalls[0]
    expect(update?.table).toBe('subscriptions')
    expect(update?.payload).toMatchObject({
      plan_id: 'plan-starter',
      pending_plan_id: null,
      current_period_start: pastPeriodEnd,
      cancel_at_period_end: false,
    })
    // New period runs 30 days from the old period end, not from "now".
    expect(update?.payload['current_period_end']).toBe(
      new Date(new Date(pastPeriodEnd).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    )
  })

  it('falls back to Free once expired with no pending plan', async () => {
    const longAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    state.subscriptionResult = {
      data: {
        status: 'active',
        current_period_end: longAgo,
        pending_plan_id: null,
        plan: planRow({ id: 'plan-studio', slug: 'studio', name: 'Studio', price_cents: 2900 }),
      },
      error: null,
    }
    state.planByIdResult = { data: planRow(), error: null }

    const plan = await getEffectivePlan('studio-1')
    expect(plan.slug).toBe('free')
    expect(state.updateCalls).toHaveLength(0)
  })
})

describe('getSubscriptionAccessState', () => {
  it('reports active (not grace/expired) once a pending downgrade has materialized', async () => {
    const pastPeriodEnd = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    state.subscriptionResult = {
      data: {
        status: 'active',
        current_period_end: pastPeriodEnd,
        pending_plan_id: 'plan-starter',
        plan: planRow({ id: 'plan-studio', slug: 'studio', name: 'Studio', price_cents: 2900 }),
      },
      error: null,
    }
    state.planByIdResult = {
      data: planRow({ id: 'plan-starter', slug: 'starter', name: 'Starter', price_cents: 1200 }),
      error: null,
    }

    const access = await getSubscriptionAccessState('studio-1')
    expect(access.state).toBe('active')
  })
})

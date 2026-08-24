import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 3 P1 regression coverage: getPayments (payments.ts),
// getSubscriptionPaymentHistory (billing.ts), and getStudioPayoutSummary
// (payouts.ts) previously read the payments table through the RLS-bound
// client with zero permission check — any active studio member (editor,
// team_member, photographer) could see the studio's full payment/payout
// ledger despite ROLE_PERMISSIONS restricting `payments:read` to
// studio_owner/super_admin only, confirmed live in
// security-hardening-phase3-select.test.ts. requireStudioPermission() is
// the fix, matching the Phase 2 P1 pattern.

const dbCalls: string[] = []

function makeBuilder(): any {
  const builder: any = {}
  const record = (name: string) => (..._args: unknown[]) => {
    dbCalls.push(name)
    return builder
  }
  for (const method of ['select', 'eq', 'in', 'not', 'gt', 'or', 'order', 'limit']) {
    builder[method] = record(method)
  }
  builder.single = async () => ({ data: null, error: null })
  builder.maybeSingle = async () => ({ data: null, error: null })
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: () => makeBuilder(),
  }),
}))

// billing.ts pulls in src/lib/entitlements/service.ts, which imports the
// real supabaseAdmin module — that module throws at import time without
// service-role env vars, so it's replaced before billing.ts is imported.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: () => makeBuilder() },
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

const { getPayments } = await import('@/lib/actions/payments')
const { getSubscriptionPaymentHistory } = await import('@/lib/actions/billing')
const { getStudioPayoutSummary } = await import('@/lib/actions/payouts')

const DENIED = { error: 'You do not have permission to perform this action' }
const ALLOWED = { userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' as const }

beforeEach(() => {
  dbCalls.length = 0
  requireStudioPermissionMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Phase 3 P1: payments-read Server Actions request payments:read', () => {
  it('getPayments requests payments:read', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await getPayments('studio-slug')
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('payments:read')
  })

  it('getSubscriptionPaymentHistory requests payments:read', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await getSubscriptionPaymentHistory('studio-slug')
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('payments:read')
  })

})

describe('Phase 4: getStudioPayoutSummary requests the dedicated payouts:read permission', () => {
  it('getStudioPayoutSummary requests payouts:read (not payments:read -- see payouts.ts)', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await getStudioPayoutSummary('studio-slug')
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('payouts:read')
  })
})

describe('Phase 3 P1: denial (UNAUTHORIZED / CROSS-STUDIO / UNAUTHENTICATED) returns empty, never touches the database', () => {
  it('getPayments returns an empty, zeroed result when denied', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const result = await getPayments('studio-slug')
    expect(result).toEqual({ payments: [], totalCollected: 0 })
    expect(dbCalls).toEqual([])
  })

  it('getSubscriptionPaymentHistory returns an empty array when denied', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const result = await getSubscriptionPaymentHistory('studio-slug')
    expect(result).toEqual([])
    expect(dbCalls).toEqual([])
  })

  it('getStudioPayoutSummary returns null when denied', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const result = await getStudioPayoutSummary('studio-slug')
    expect(result).toBeNull()
    expect(dbCalls).toEqual([])
  })
})

describe('Phase 3 P1: authorized role proceeds to the database', () => {
  it('getPayments queries once permitted', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await getPayments('studio-slug')
    expect(dbCalls.length).toBeGreaterThan(0)
  })

  it('getStudioPayoutSummary queries once permitted', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await getStudioPayoutSummary('studio-slug')
    expect(dbCalls.length).toBeGreaterThan(0)
  })
})

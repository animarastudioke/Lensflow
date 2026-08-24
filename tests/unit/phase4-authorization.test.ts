import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasPermission } from '@/lib/auth/permissions'

// Phase 4 pre-deployment architecture decision: closes two gaps left open
// by migration 037's initial scope.
//
// 1. payouts:read / subscriptions:read are new dedicated permissions
//    (src/lib/auth/permissions.ts), granted ONLY to studio_owner/
//    super_admin -- mirroring payments:read's existing role set exactly
//    (photographer, despite holding nearly every other :read permission,
//    was already deliberately excluded from payments:read; payouts and
//    subscriptions follow that same established pattern, not a new one).
//
// 2. getAnalyticsOverview previously had zero application-layer check --
//    analytics:read is deliberately withheld from team_member and editor
//    in ROLE_PERMISSIONS, but neither the analytics page nor the Server
//    Action itself enforced that, so both roles could reach full studio
//    revenue/client/booking figures via the Server Action RPC endpoint
//    even once the analytics *page* is gated (a page-level check alone
//    doesn't stop a direct RPC call).

describe('Phase 4: payouts:read / subscriptions:read permission grants', () => {
  it('studio_owner and super_admin hold payouts:read and subscriptions:read', () => {
    expect(hasPermission('studio_owner', 'payouts:read')).toBe(true)
    expect(hasPermission('studio_owner', 'subscriptions:read')).toBe(true)
    expect(hasPermission('super_admin', 'payouts:read')).toBe(true)
    expect(hasPermission('super_admin', 'subscriptions:read')).toBe(true)
  })

  it('photographer, team_member, editor, and client hold neither -- no role is granted these merely because it holds other broad :read permissions', () => {
    for (const role of ['photographer', 'team_member', 'editor', 'client'] as const) {
      expect(hasPermission(role, 'payouts:read')).toBe(false)
      expect(hasPermission(role, 'subscriptions:read')).toBe(false)
    }
  })
})

const dbCalls: string[] = []

function makeBuilder(): any {
  const builder: any = {}
  const record = (name: string) => (..._args: unknown[]) => {
    dbCalls.push(name)
    return builder
  }
  for (const method of ['select', 'eq', 'in', 'not', 'gte', 'lt', 'neq', 'order', 'limit']) {
    builder[method] = record(method)
  }
  builder.single = async () => ({ data: null, error: null })
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: () => makeBuilder(),
  }),
}))

vi.mock('@/lib/actions/studios', () => ({
  getStudioCurrency: async () => 'KES',
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

const { getAnalyticsOverview } = await import('@/lib/actions/analytics')

const DENIED = { error: 'You do not have permission to perform this action' }
const ALLOWED = { userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' as const }

beforeEach(() => {
  dbCalls.length = 0
  requireStudioPermissionMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Phase 4: getAnalyticsOverview requests analytics:read', () => {
  it('requests analytics:read', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await getAnalyticsOverview('studio-slug', '30d')
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('analytics:read')
  })

  it('returns null and touches no table when denied (team_member/editor lack analytics:read)', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const result = await getAnalyticsOverview('studio-slug', '30d')
    expect(result).toBeNull()
    expect(dbCalls).toEqual([])
  })

  it('proceeds to query once permitted, scoped by the verified membership.studioId (not the untrusted slug)', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    const result = await getAnalyticsOverview('studio-slug', '30d')
    expect(result).not.toBeNull()
    expect(dbCalls.length).toBeGreaterThan(0)
  })
})

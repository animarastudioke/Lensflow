import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 5 P4/P5 wiring tests: regenerateQuestionnaireResponseShareToken
// and regenerateOrderShareToken, matching the established
// regenerateInvoiceShareToken/regenerateQuoteShareToken pattern. Proves
// the permission-check wiring (correct permission requested, denial
// blocks the update, authorized proceeds) -- live token-revocation
// behavior (old token stops working, new token works) is proven
// separately in tests/integration/*-token-regeneration.test.ts against
// the real database.

const dbCalls: string[] = []

function makeBuilder(): any {
  const builder: any = {}
  const record = (name: string) => (..._args: unknown[]) => {
    if (name === 'update') dbCalls.push(name)
    return builder
  }
  for (const method of ['select', 'update', 'eq']) {
    builder[method] = record(method)
  }
  builder.single = async () => ({ data: { id: 'row-1' }, error: null })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: () => makeBuilder(),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: () => makeBuilder() },
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { regenerateQuestionnaireResponseShareToken } = await import('@/lib/actions/questionnaires')
const { regenerateOrderShareToken } = await import('@/lib/actions/orders')

const DENIED = { error: 'You do not have permission to perform this action' }
const ALLOWED = { userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' as const }

beforeEach(() => {
  dbCalls.length = 0
  requireStudioPermissionMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Phase 5 P4: regenerateQuestionnaireResponseShareToken', () => {
  it('requests questionnaires:update', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await regenerateQuestionnaireResponseShareToken('response-1', 'studio-slug')
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('questionnaires:update')
  })

  it('denied: never touches the database', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const result = await regenerateQuestionnaireResponseShareToken('response-1', 'studio-slug')
    expect(result).toEqual(DENIED)
    expect(dbCalls).toEqual([])
  })

  it('authorized: updates the token and returns a fresh one', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    const result = await regenerateQuestionnaireResponseShareToken('response-1', 'studio-slug')
    expect(dbCalls).toContain('update')
    expect('shareToken' in (result as object)).toBe(true)
    expect((result as { shareToken: string }).shareToken).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('Phase 5 P5: regenerateOrderShareToken', () => {
  it('requests store:manage_orders', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await regenerateOrderShareToken('order-1', 'studio-slug')
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('store:manage_orders')
  })

  it('denied: never touches the database', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const result = await regenerateOrderShareToken('order-1', 'studio-slug')
    expect(result).toEqual(DENIED)
    expect(dbCalls).toEqual([])
  })

  it('authorized: updates the token and returns a fresh one', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    const result = await regenerateOrderShareToken('order-1', 'studio-slug')
    expect(dbCalls).toContain('update')
    expect('shareToken' in (result as object)).toBe(true)
    expect((result as { shareToken: string }).shareToken).toMatch(/^[0-9a-f]{32}$/)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 10 regression coverage: the dashboard root's "bounce to my
// existing studio" redirect already ordered by joined_at (Phase 11 Step 6),
// but the /dashboard/new page's own already-onboarded bounce-back ran the
// identical query without that ordering -- meaning which studio a
// multi-membership user landed on from /dashboard/new specifically wasn't
// guaranteed consistent between visits. This proves both entry points now
// order the same way.

const eqCalls: { column: string; value: unknown }[] = []
let orderCalled: { column: string; options: unknown } | null = null

function makeStudioMembersBuilder(): any {
  const builder: any = {}
  builder.select = () => builder
  builder.eq = (column: string, value: unknown) => { eqCalls.push({ column, value }); return builder }
  builder.order = (column: string, options: unknown) => { orderCalled = { column, options }; return builder }
  builder.limit = () => builder
  builder.maybeSingle = async () => ({ data: { studio: { slug: 'my-studio' } } })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: () => makeStudioMembersBuilder() }),
}))

const getAuthUserServerMock = vi.fn()
vi.mock('@/lib/auth', () => ({
  getAuthUserServer: () => getAuthUserServerMock(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) }),
}))

vi.mock('@/components/onboarding/NewStudioForm', () => ({
  NewStudioForm: () => null,
}))

beforeEach(() => {
  eqCalls.length = 0
  orderCalled = null
  getAuthUserServerMock.mockReset()
  getAuthUserServerMock.mockResolvedValue({ id: 'user-1', firstName: 'Jane' })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('dashboard root (/dashboard) entry redirect', () => {
  it('orders active memberships by joined_at ascending before picking one', async () => {
    const { default: DashboardRootPage } = await import('@/app/dashboard/page')
    await expect(DashboardRootPage()).rejects.toThrow('REDIRECT:/dashboard/my-studio')
    expect(eqCalls).toContainEqual({ column: 'status', value: 'active' })
    expect(orderCalled).toEqual({ column: 'joined_at', options: { ascending: true } })
  })
})

describe('/dashboard/new already-onboarded bounce-back', () => {
  it('orders active memberships by joined_at ascending the same way as the dashboard root', async () => {
    const { default: NewStudioPage } = await import('@/app/dashboard/new/page')
    await expect(NewStudioPage({} as never)).rejects.toThrow('REDIRECT:/dashboard/my-studio')
    expect(eqCalls).toContainEqual({ column: 'status', value: 'active' })
    expect(orderCalled).toEqual({ column: 'joined_at', options: { ascending: true } })
  })
})

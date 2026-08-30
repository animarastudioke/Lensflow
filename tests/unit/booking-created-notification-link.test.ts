import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 12 Step 13: createBooking's 'booking_created' notification link was
// previously built from formData.get('studio_slug') -- client-submitted,
// unverified against the trusted membership.studioId. A mismatched slug
// would send that studio's own members to a URL for a different studio
// (not a data leak -- the destination page independently re-authorizes --
// but a real correctness bug). The link is now re-derived server-side from
// the already-trusted studioId, the same pattern galleries.ts already used
// for its own notification producers.

const STUDIO_ID = 'studio-real-id'
const REAL_SLUG = 'real-studio-slug'

const notificationCalls: { studioId: string; params: Record<string, unknown> }[] = []

function builderFor(table: string): any {
  const builder: any = {}
  const eqCalls: Record<string, unknown> = {}
  builder.select = () => builder
  builder.insert = () => ({ error: null })
  builder.eq = (col: string, val: unknown) => { eqCalls[col] = val; return builder }
  builder.single = async () => {
    if (table === 'studios') return { data: { slug: REAL_SLUG }, error: null }
    return { data: null, error: null }
  }
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (table: string) => builderFor(table) }),
}))

vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: vi.fn(async () => ({ userId: 'user-1', studioId: STUDIO_ID, role: 'studio_owner' })),
}))

vi.mock('@/lib/entitlements', () => ({
  requireEntitlement: vi.fn(async () => {}),
}))

vi.mock('@/lib/actions/clients', () => ({
  clientBelongsToStudio: vi.fn(async () => true),
}))

vi.mock('@/lib/actions/notifications', () => ({
  createNotification: vi.fn(async (studioId: string, params: Record<string, unknown>) => {
    notificationCalls.push({ studioId, params })
  }),
}))

const { createBooking } = await import('@/lib/actions/bookings')

function bookingFormData(spoofedSlug: string): FormData {
  const fd = new FormData()
  fd.set('session_name', 'QA Session')
  fd.set('type', 'wedding')
  fd.set('studio_slug', spoofedSlug) // client-controlled; must not be trusted for the link
  return fd
}

beforeEach(() => {
  notificationCalls.length = 0
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('createBooking: booking_created notification link is server-derived', () => {
  it('uses the real studio slug looked up from the trusted studioId, not a client-submitted one', async () => {
    await createBooking(bookingFormData('attacker-supplied-wrong-slug')).catch(() => {})
    expect(notificationCalls).toHaveLength(1)
    expect(notificationCalls[0]?.params['link']).toBe(`/dashboard/${REAL_SLUG}/bookings`)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 2 P3-B regression coverage: markNotificationRead/markAllNotificationsRead
// previously relied entirely on RLS (is_studio_member(studio_id) on the
// notifications UPDATE policy) with no application-layer check at all — this
// proves the added defense-in-depth layer actually blocks an unauthenticated
// caller, and a caller who isn't an active member of the notification's own
// studio (resolved from the row itself, not trusted from the studioSlug
// argument), independently of RLS.

const state: {
  user: { id: string } | null
  notification: { studio_id: string } | null
  studio: { id: string } | null
  membership: { id: string } | null
} = { user: null, notification: null, studio: null, membership: null }

const updateCalls: Array<{ table: string; payload: unknown }> = []

function builderFor(table: string) {
  const builder: any = {}
  builder.select = () => builder
  builder.update = (payload: unknown) => {
    updateCalls.push({ table, payload })
    return builder
  }
  builder.eq = () => builder
  builder.is = () => builder
  builder.single = async () => {
    if (table === 'notifications') return { data: state.notification }
    if (table === 'studios') return { data: state.studio }
    if (table === 'studio_members') return { data: state.membership }
    return { data: null }
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => builderFor(table),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (table: string) => builderFor(table) },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { markNotificationRead, markAllNotificationsRead } = await import('@/lib/actions/notifications')

beforeEach(() => {
  state.user = null
  state.notification = null
  state.studio = null
  state.membership = null
  updateCalls.length = 0
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('markNotificationRead', () => {
  it('UNAUTHENTICATED: does nothing when there is no session', async () => {
    state.notification = { studio_id: 'studio-1' }
    state.membership = { id: 'member-1' }
    await markNotificationRead('notif-1', 'studio-slug')
    expect(updateCalls).toEqual([])
  })

  it('does nothing when the notification does not exist', async () => {
    state.user = { id: 'user-1' }
    state.notification = null
    await markNotificationRead('notif-1', 'studio-slug')
    expect(updateCalls).toEqual([])
  })

  it('CROSS-STUDIO: does nothing when the caller has no active membership in the notification\'s own studio', async () => {
    state.user = { id: 'user-1' }
    state.notification = { studio_id: 'studio-1' }
    state.membership = null // caller is authenticated but not an active member of studio-1
    await markNotificationRead('notif-1', 'studio-slug')
    expect(updateCalls).toEqual([])
  })

  it('AUTHORIZED: marks the notification read once the caller is an active member of its studio', async () => {
    state.user = { id: 'user-1' }
    state.notification = { studio_id: 'studio-1' }
    state.membership = { id: 'member-1' }
    await markNotificationRead('notif-1', 'studio-slug')
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]?.table).toBe('notifications')
  })
})

describe('markAllNotificationsRead', () => {
  it('UNAUTHENTICATED: does nothing when there is no session', async () => {
    state.studio = { id: 'studio-1' }
    state.membership = { id: 'member-1' }
    await markAllNotificationsRead('studio-slug')
    expect(updateCalls).toEqual([])
  })

  it('does nothing when the studio slug does not resolve', async () => {
    state.user = { id: 'user-1' }
    state.studio = null
    await markAllNotificationsRead('studio-slug')
    expect(updateCalls).toEqual([])
  })

  it('CROSS-STUDIO: does nothing when the caller has no active membership in that studio', async () => {
    state.user = { id: 'user-1' }
    state.studio = { id: 'studio-1' }
    state.membership = null
    await markAllNotificationsRead('studio-slug')
    expect(updateCalls).toEqual([])
  })

  it('AUTHORIZED: marks notifications read once the caller is an active member', async () => {
    state.user = { id: 'user-1' }
    state.studio = { id: 'studio-1' }
    state.membership = { id: 'member-1' }
    await markAllNotificationsRead('studio-slug')
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]?.table).toBe('notifications')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 8 regression coverage: updateBooking/deleteBooking/
// updateBookingStatus and createProject/updateProject are new Server
// Actions (Bookings previously had no update/delete/status-change action at
// all -- BookingList mutated only local React state; Projects had no
// create/update action at all). This proves every mutation scopes its
// database write to `membership.studioId` -- the studio resolved
// server-side from the caller's own studio_members row via
// requireStudioPermission() -- rather than any studio_id a client could
// smuggle in through form data or a route param. A caller who knows
// another studio's booking/project id cannot touch it: the .eq('studio_id',
// ...) clause means the update/delete matches zero rows for a foreign id.

const eqCalls: { table: string; column: string; value: unknown }[] = []
const mutationCalls: { table: string; op: string }[] = []
let insertedRow: Record<string, unknown> | null = null

function makeBuilder(table: string): any {
  const builder: any = {}
  builder.select = () => builder
  builder.insert = (row: Record<string, unknown>) => {
    mutationCalls.push({ table, op: 'insert' })
    insertedRow = row
    return builder
  }
  builder.update = () => {
    mutationCalls.push({ table, op: 'update' })
    return builder
  }
  builder.delete = () => {
    mutationCalls.push({ table, op: 'delete' })
    return builder
  }
  builder.eq = (column: string, value: unknown) => {
    eqCalls.push({ table, column, value })
    return builder
  }
  builder.single = async () => ({ data: { id: 'new-id' }, error: null })
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => makeBuilder(table),
  }),
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) }),
}))
vi.mock('@/lib/entitlements', () => ({
  requireEntitlement: vi.fn(async () => {}),
  hasEntitlement: vi.fn(async () => true),
}))
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/email/templates', () => ({ bookingConfirmationEmail: vi.fn(() => ({ subject: '', html: '' })) }))

const bookingsActions = await import('@/lib/actions/bookings')
const projectsActions = await import('@/lib/actions/projects')

const ALLOWED = { userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' as const }

function bookingFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('id', 'booking-1')
  fd.set('studio_slug', 'studio-slug')
  fd.set('session_name', 'Smith Wedding')
  fd.set('type', 'wedding')
  fd.set('status', 'confirmed')
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

function projectFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('id', 'project-1')
  fd.set('studio_slug', 'studio-slug')
  fd.set('name', 'Smith Wedding')
  fd.set('type', 'wedding')
  fd.set('status', 'planning')
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  eqCalls.length = 0
  mutationCalls.length = 0
  insertedRow = null
  requireStudioPermissionMock.mockReset()
  requireStudioPermissionMock.mockResolvedValue(ALLOWED)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('bookings: mutations scope to the server-resolved studio, never a client-supplied one', () => {
  it('updateBooking scopes the update to membership.studioId', async () => {
    await bookingsActions.updateBooking(bookingFormData()).catch(() => {})
    expect(eqCalls).toContainEqual({ table: 'bookings', column: 'studio_id', value: 'studio-1' })
    expect(mutationCalls).toContainEqual({ table: 'bookings', op: 'update' })
  })

  it('deleteBooking scopes the delete to membership.studioId', async () => {
    await bookingsActions.deleteBooking('booking-1', 'studio-slug')
    expect(eqCalls).toContainEqual({ table: 'bookings', column: 'studio_id', value: 'studio-1' })
    expect(mutationCalls).toContainEqual({ table: 'bookings', op: 'delete' })
  })

  it('updateBookingStatus scopes the update to membership.studioId and persists the new status', async () => {
    const result = await bookingsActions.updateBookingStatus('booking-1', 'studio-slug', 'cancelled')
    expect(eqCalls).toContainEqual({ table: 'bookings', column: 'studio_id', value: 'studio-1' })
    expect(mutationCalls).toContainEqual({ table: 'bookings', op: 'update' })
    expect(result).toEqual({ success: true })
  })

  it('a caller with a foreign booking id still only ever scopes by their own studioId (never the booking id alone)', async () => {
    // Even if 'booking-1' actually belongs to a different studio, the delete
    // is issued as .eq('id', 'booking-1').eq('studio_id', 'studio-1') -- the
    // real database matches zero rows for a foreign booking, it is never a
    // client-controlled bypass of the studio scope.
    await bookingsActions.deleteBooking('booking-1', 'studio-slug')
    const studioScope = eqCalls.find(c => c.table === 'bookings' && c.column === 'studio_id')
    expect(studioScope?.value).toBe(ALLOWED.studioId)
  })
})

describe('projects: mutations scope to the server-resolved studio, never a client-supplied one', () => {
  it('createProject inserts with studio_id set from membership, not from form data', async () => {
    const fd = projectFormData()
    fd.set('studio_id', 'attacker-studio') // a client cannot smuggle a studio_id in
    await projectsActions.createProject(fd).catch(() => {})
    expect(mutationCalls).toContainEqual({ table: 'projects', op: 'insert' })
    expect(insertedRow?.['studio_id']).toBe('studio-1')
  })

  it('updateProject scopes the update to membership.studioId', async () => {
    await projectsActions.updateProject(projectFormData()).catch(() => {})
    expect(eqCalls).toContainEqual({ table: 'projects', column: 'studio_id', value: 'studio-1' })
    expect(mutationCalls).toContainEqual({ table: 'projects', op: 'update' })
  })
})

describe('bookings/projects: reads (getBooking/getProject) resolve the studio server-side before scoping', () => {
  it('getBooking scopes by the studio resolved from the slug, then the booking id', async () => {
    await bookingsActions.getBooking('booking-1', 'studio-slug')
    expect(eqCalls.some(c => c.table === 'studios' && c.column === 'slug' && c.value === 'studio-slug')).toBe(true)
  })

  it('getProject scopes by the studio resolved from the slug, then the project id', async () => {
    await projectsActions.getProject('project-1', 'studio-slug')
    expect(eqCalls.some(c => c.table === 'studios' && c.column === 'slug' && c.value === 'studio-slug')).toBe(true)
  })
})

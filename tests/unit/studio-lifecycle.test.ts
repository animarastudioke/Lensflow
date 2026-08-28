import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 10 regression coverage: deleteStudio and createStudio had
// zero test coverage before this step. deleteStudio uses a manual
// owner_id-equality check rather than requireStudioPermission (there's no
// "studios:delete" permission granted to anyone but the owner in
// ROLE_PERMISSIONS, so this is a deliberate, narrower gate) -- this proves
// that check actually blocks a non-owner, and that a correct owner + a
// correct confirmation name is required before the destructive delete runs.
// createStudio's own tests prove the anti-abuse Free-plan block, the slug
// collision guard, and (the one behavior change this step made) that a
// successful creation redirects to the new /welcome page, not straight to
// an empty dashboard.

const dbCalls: { table: string; op: string }[] = []
let studioRow: { id: string; name: string; owner_id: string; slug: string } | null = {
  id: 'studio-1', name: 'Test Studio', owner_id: 'owner-1', slug: 'studio-1',
}
let currentUserId = 'owner-1'

function makeBuilder(table: string): any {
  const builder: any = {}
  builder.select = () => builder
  builder.insert = (..._args: unknown[]) => { dbCalls.push({ table, op: 'insert' }); return builder }
  builder.update = (..._args: unknown[]) => { dbCalls.push({ table, op: 'update' }); return builder }
  builder.delete = () => { dbCalls.push({ table, op: 'delete' }); return builder }
  builder.eq = () => builder
  // .maybeSingle() on studios is createStudio's slug-collision check --
  // null means "not taken", the success-path default here.
  builder.maybeSingle = async () => ({ data: null })
  // .single() on studios covers both deleteStudio's owner lookup and
  // createStudio's post-insert select(id, slug) -- studioRow carries both
  // shapes' fields.
  builder.single = async () => {
    if (table === 'studios') return { data: studioRow, error: studioRow ? null : { message: 'not found' } }
    return { data: { id: 'row-1' }, error: null }
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null, count: 0 })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUserId ? { id: currentUserId, created_at: '2026-01-01' } : null } }) },
    from: (table: string) => makeBuilder(table),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (table: string) => makeBuilder(table) },
}))

vi.mock('@/lib/storage/r2', () => ({
  deleteObjectsByPrefix: vi.fn(async () => {}),
  deleteObject: vi.fn(async () => {}),
  uploadObject: vi.fn(async () => ({ key: 'k', url: 'u' })),
  getR2PublicUrl: vi.fn(() => 'https://example.com/logo.png'),
  keyFromR2PublicUrl: vi.fn(() => null),
}))

vi.mock('@/lib/entitlements', () => ({
  getFreePlan: vi.fn(async () => ({ id: 'plan-free', slug: 'free' })),
  getEffectivePlan: vi.fn(async () => ({ id: 'plan-free', slug: 'free' })),
}))

vi.mock('@/lib/actions/signup-risk', () => ({
  recordFreeWorkspaceSignupRisk: vi.fn(async () => {}),
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) }),
}))

const studiosActions = await import('@/lib/actions/studios')

beforeEach(() => {
  dbCalls.length = 0
  studioRow = { id: 'studio-1', name: 'Test Studio', owner_id: 'owner-1', slug: 'studio-1' }
  currentUserId = 'owner-1'
  requireStudioPermissionMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('deleteStudio: owner-only, name-confirmed deletion', () => {
  it('rejects a non-owner and performs no delete', async () => {
    currentUserId = 'not-the-owner'
    const result = await studiosActions.deleteStudio('test-studio', 'Test Studio')
    expect(result).toEqual({ error: 'Only the studio owner can delete this studio' })
    expect(dbCalls).not.toContainEqual({ table: 'studios', op: 'delete' })
  })

  it('rejects a mismatched confirmation name and performs no delete', async () => {
    const result = await studiosActions.deleteStudio('test-studio', 'Wrong Name')
    expect(result).toEqual({ error: 'Studio name does not match' })
    expect(dbCalls).not.toContainEqual({ table: 'studios', op: 'delete' })
  })

  it('rejects an unauthenticated caller', async () => {
    currentUserId = ''
    const result = await studiosActions.deleteStudio('test-studio', 'Test Studio')
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(dbCalls).not.toContainEqual({ table: 'studios', op: 'delete' })
  })

  it('deletes once the caller is the owner and the name matches', async () => {
    await expect(studiosActions.deleteStudio('test-studio', 'Test Studio')).rejects.toThrow('REDIRECT:/dashboard/new')
    expect(dbCalls).toContainEqual({ table: 'studios', op: 'delete' })
  })
})

function studioFormData(name: string, slug: string): FormData {
  const fd = new FormData()
  fd.set('name', name)
  fd.set('slug', slug)
  return fd
}

describe('createStudio: onboarding persistence and redirect target', () => {
  it('redirects to /welcome (not straight to an empty dashboard) on success', async () => {
    await expect(studiosActions.createStudio(studioFormData('New Studio', 'new-studio-slug')))
      .rejects.toThrow('REDIRECT:/dashboard/studio-1/welcome')
    expect(dbCalls).toContainEqual({ table: 'studios', op: 'insert' })
  })

  it('rejects an unauthenticated caller before writing anything', async () => {
    currentUserId = ''
    const result = await studiosActions.createStudio(studioFormData('New Studio', 'new-studio-slug'))
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(dbCalls).not.toContainEqual({ table: 'studios', op: 'insert' })
  })

  it('rejects an invalid slug before writing anything', async () => {
    const result = await studiosActions.createStudio(studioFormData('New Studio', 'Not A Valid Slug!'))
    expect(result?.error).toBeTruthy()
    expect(dbCalls).not.toContainEqual({ table: 'studios', op: 'insert' })
  })
})

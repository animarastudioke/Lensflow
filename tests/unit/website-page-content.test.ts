import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 11: website_pages.content has existed since the baseline
// schema but was never written by any Server Action -- pages always saved
// as `{}`. This proves updateWebsitePageContent() (1) requires
// website:manage_pages like the other page-mutation actions, (2) resolves
// the website's ownership from the database via websiteId + the caller's
// own studioId rather than trusting a client-supplied studio_id, and
// (3) refuses to write when the website doesn't belong to the caller's
// studio -- the same cross-studio guard addWebsitePage/deleteWebsitePage
// already use.

const dbCalls: { table: string; op: string; eq: Record<string, unknown> }[] = []
let websiteRow: { id: string } | null = { id: 'website-1' }

function makeBuilder(table: string): any {
  const builder: any = { _eq: {} }
  builder.select = () => builder
  builder.update = (payload: unknown) => {
    dbCalls.push({ table, op: 'update', eq: { ...builder._eq, payload } })
    return builder
  }
  builder.eq = (column: string, value: unknown) => {
    builder._eq[column] = value
    return builder
  }
  builder.single = async () => {
    if (table === 'websites') return { data: websiteRow, error: websiteRow ? null : { message: 'not found' } }
    return { data: { id: 'row-1' }, error: null }
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (table: string) => makeBuilder(table) }),
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/entitlements', () => ({
  hasEntitlement: vi.fn(async () => true),
  requireEntitlement: vi.fn(async () => ({ id: 'plan-studio', slug: 'studio' })),
}))

const websitesActions = await import('@/lib/actions/websites')

function contentFormData(overrides: Partial<Record<string, string>> = {}): FormData {
  const fd = new FormData()
  fd.set('page_id', overrides['page_id'] ?? 'page-1')
  fd.set('website_id', overrides['website_id'] ?? 'website-1')
  fd.set('studio_slug', overrides['studio_slug'] ?? 'test-studio')
  fd.set('heading', overrides['heading'] ?? 'New heading')
  fd.set('body', overrides['body'] ?? 'New body text')
  return fd
}

beforeEach(() => {
  dbCalls.length = 0
  websiteRow = { id: 'website-1' }
  requireStudioPermissionMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('updateWebsitePageContent: authorization', () => {
  it('rejects a caller without website:manage_pages before touching the database', async () => {
    requireStudioPermissionMock.mockResolvedValue({ error: 'You do not have permission to perform this action' })
    const result = await websitesActions.updateWebsitePageContent(contentFormData())
    expect(result).toEqual({ error: 'You do not have permission to perform this action' })
    expect(dbCalls).toHaveLength(0)
  })

  it('requires the website:manage_pages permission specifically', async () => {
    requireStudioPermissionMock.mockResolvedValue({ userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' })
    await websitesActions.updateWebsitePageContent(contentFormData())
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('website:manage_pages')
  })
})

describe('updateWebsitePageContent: tenant scoping', () => {
  it('refuses to write page content when the website does not belong to the caller\'s studio', async () => {
    websiteRow = null // simulates .eq('studio_id', membership.studioId) matching zero rows -- cross-studio website id
    requireStudioPermissionMock.mockResolvedValue({ userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' })
    const result = await websitesActions.updateWebsitePageContent(contentFormData())
    expect(result).toEqual({ error: 'Website not found' })
    expect(dbCalls.find((c) => c.table === 'website_pages')).toBeUndefined()
  })
})

describe('updateWebsitePageContent: persistence', () => {
  it('writes a real content object (heading + body) to website_pages when authorized', async () => {
    requireStudioPermissionMock.mockResolvedValue({ userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' })
    const result = await websitesActions.updateWebsitePageContent(contentFormData({ heading: 'Hello', body: 'World' }))
    expect(result).toBeUndefined()
    const pageUpdate = dbCalls.find((c) => c.table === 'website_pages' && c.op === 'update')
    expect(pageUpdate).toBeDefined()
    expect((pageUpdate!.eq['payload'] as { content: { heading: string; body: string } }).content).toEqual({ heading: 'Hello', body: 'World' })
  })

  it('rejects a heading longer than 200 characters before writing anything', async () => {
    requireStudioPermissionMock.mockResolvedValue({ userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' })
    await expect(
      websitesActions.updateWebsitePageContent(contentFormData({ heading: 'x'.repeat(201) }))
    ).rejects.toThrow()
    expect(dbCalls.find((c) => c.table === 'website_pages')).toBeUndefined()
  })
})

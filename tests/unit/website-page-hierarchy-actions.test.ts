import { beforeEach, describe, expect, it, vi } from 'vitest'

// Nested pages are derived from `path`, so the rules that keep the tree
// coherent live in the Server Actions: no third level, no child without its
// parent page, no deleting a parent that still has sub-pages, and a reorder
// that only ever renumbers exactly this website's pages.

interface PageRow { id: string; path: string; website_id: string }

let pages: PageRow[] = []
let websiteRow: { id: string; subdomain: string; status: string } | null = null
let failUpdateFor: string | null = null
const updates: { id: unknown; website_id: unknown; payload: Record<string, unknown> }[] = []
const deletes: { id: unknown; website_id: unknown }[] = []
const inserts: Record<string, unknown>[] = []

function makeBuilder(table: string): any {
  const filters: Record<string, unknown> = {}
  let mode: 'select' | 'update' | 'delete' | 'insert' = 'select'
  let payload: Record<string, unknown> = {}
  const rows = () => pages.filter((p) => Object.entries(filters).every(([k, v]) => (p as unknown as Record<string, unknown>)[k] === v))
  const builder: any = {}
  builder.select = () => builder
  builder.eq = (column: string, value: unknown) => { filters[column] = value; return builder }
  builder.update = (p: Record<string, unknown>) => { mode = 'update'; payload = p; return builder }
  builder.delete = () => { mode = 'delete'; return builder }
  builder.insert = (p: Record<string, unknown>) => { mode = 'insert'; inserts.push(p); payload = p; return builder }
  builder.single = async () => {
    if (table === 'websites') return { data: websiteRow, error: websiteRow ? null : { message: 'not found' } }
    if (mode === 'insert') return { data: { id: 'new-page', ...payload }, error: null }
    const found = rows()[0]
    if (mode === 'update' && found) updates.push({ id: filters['id'], website_id: filters['website_id'], payload })
    if (mode === 'delete' && found) deletes.push({ id: filters['id'], website_id: filters['website_id'] })
    return found ? { data: { path: found.path }, error: null } : { data: null, error: { message: 'none' } }
  }
  builder.maybeSingle = async () => {
    const found = rows()[0]
    return { data: found ? { id: found.id, path: found.path } : null, error: null }
  }
  builder.then = (resolve: (v: unknown) => void) => {
    if (mode === 'update') {
      updates.push({ id: filters['id'], website_id: filters['website_id'], payload })
      return resolve({ data: null, error: failUpdateFor === filters['id'] ? { message: 'boom' } : null })
    }
    return resolve({ data: rows().map((p) => ({ id: p.id, path: p.path })), error: null, count: rows().length })
  }
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

const actions = await import('@/lib/actions/websites')

const OWNER = { userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' }

function page(id: string, path: string, websiteId = 'website-1'): PageRow {
  return { id, path, website_id: websiteId }
}

function addForm(path: string): FormData {
  const fd = new FormData()
  fd.set('website_id', 'website-1')
  fd.set('studio_slug', 'test-studio')
  fd.set('name', 'Wedding')
  fd.set('path', path)
  return fd
}

beforeEach(() => {
  pages = [page('home', '/'), page('portfolio', '/portfolio'), page('wedding', '/portfolio/wedding'), page('about', '/about')]
  websiteRow = { id: 'website-1', subdomain: 'test-studio', status: 'draft' }
  failUpdateFor = null
  updates.length = 0
  deletes.length = 0
  inserts.length = 0
  requireStudioPermissionMock.mockReset()
  requireStudioPermissionMock.mockResolvedValue(OWNER)
})

describe('addWebsitePage: hierarchy rules', () => {
  it('adds a sub-page under an existing top-level page', async () => {
    await actions.addWebsitePage(addForm('/portfolio/studio'))
    expect(inserts).toHaveLength(1)
    expect(inserts[0]).toMatchObject({ path: '/portfolio/studio', website_id: 'website-1' })
  })

  it('refuses a sub-page whose parent page does not exist', async () => {
    await expect(actions.addWebsitePage(addForm('/gear/lenses'))).rejects.toThrow('Create the "/gear" page first.')
    expect(inserts).toHaveLength(0)
  })

  it('refuses a third level', async () => {
    await expect(actions.addWebsitePage(addForm('/portfolio/wedding/2026'))).rejects.toThrow('one level deep')
    expect(inserts).toHaveLength(0)
  })

  it('looks the parent up on this website only', async () => {
    pages = [page('other-portfolio', '/portfolio', 'website-2')]
    await expect(actions.addWebsitePage(addForm('/portfolio/wedding'))).rejects.toThrow('Create the "/portfolio" page first.')
  })
})

describe('deleteWebsitePage: sub-pages', () => {
  it('refuses to delete a page that still has sub-pages, even on a draft site', async () => {
    const result = await actions.deleteWebsitePage('portfolio', 'website-1', 'test-studio')
    expect(result).toEqual({ error: 'Delete or move its sub-pages first.' })
    expect(deletes).toHaveLength(0)
  })

  it('deletes a sub-page', async () => {
    const result = await actions.deleteWebsitePage('wedding', 'website-1', 'test-studio')
    expect(result).toBeUndefined()
    expect(deletes).toEqual([{ id: 'wedding', website_id: 'website-1' }])
  })

  it('does not treat a sibling with a shared name prefix as a child', async () => {
    pages = [page('portfolio', '/portfolio'), page('old', '/portfolio-old')]
    const result = await actions.deleteWebsitePage('portfolio', 'website-1', 'test-studio')
    expect(result).toBeUndefined()
  })

  it('still protects Home on a published site', async () => {
    websiteRow = { id: 'website-1', subdomain: 'test-studio', status: 'published' }
    const result = await actions.deleteWebsitePage('home', 'website-1', 'test-studio')
    expect(result).toEqual({ error: 'Unpublish the website before deleting its Home page.' })
  })

  it('fails closed when the page cannot be found', async () => {
    const result = await actions.deleteWebsitePage('missing', 'website-1', 'test-studio')
    expect(result).toEqual({ error: 'Failed to delete page' })
    expect(deletes).toHaveLength(0)
  })
})

describe('renameWebsitePage', () => {
  it('renames only the label and never the path', async () => {
    const result = await actions.renameWebsitePage('about', 'website-1', 'test-studio', '  About us  ')
    expect(result).toEqual({ success: true })
    expect(updates[0]?.payload).toMatchObject({ name: 'About us' })
    expect(updates[0]?.payload).not.toHaveProperty('path')
  })

  it('rejects an empty or over-long name before touching the database', async () => {
    expect(await actions.renameWebsitePage('about', 'website-1', 'test-studio', '   ')).toEqual({ error: expect.any(String) })
    expect(await actions.renameWebsitePage('about', 'website-1', 'test-studio', 'x'.repeat(101))).toEqual({ error: expect.any(String) })
    expect(updates).toHaveLength(0)
  })

  it('passes a permission error through untouched', async () => {
    requireStudioPermissionMock.mockResolvedValue({ error: 'You do not have permission to perform this action' })
    expect(await actions.renameWebsitePage('about', 'website-1', 'test-studio', 'About')).toEqual({ error: 'You do not have permission to perform this action' })
    expect(updates).toHaveLength(0)
  })

  it('refuses when the website belongs to another studio', async () => {
    websiteRow = null
    expect(await actions.renameWebsitePage('about', 'website-1', 'test-studio', 'About')).toEqual({ error: 'Website not found' })
    expect(updates).toHaveLength(0)
  })
})

describe('reorderWebsitePages', () => {
  it('renumbers exactly this website\'s pages by position, scoped by website', async () => {
    const result = await actions.reorderWebsitePages('website-1', 'test-studio', ['about', 'home', 'wedding', 'portfolio'])
    expect(result).toEqual({ success: true })
    expect(updates.map((u) => [u.id, u.payload['order']])).toEqual([['about', 0], ['home', 1], ['wedding', 2], ['portfolio', 3]])
    expect(updates.every((u) => u.website_id === 'website-1')).toBe(true)
  })

  it('rejects an id from another website and writes nothing', async () => {
    const result = await actions.reorderWebsitePages('website-1', 'test-studio', ['about', 'home', 'wedding', 'foreign-page'])
    expect(result).toEqual({ error: 'The page list is out of date. Reload and try again.' })
    expect(updates).toHaveLength(0)
  })

  it('rejects a partial list', async () => {
    const result = await actions.reorderWebsitePages('website-1', 'test-studio', ['about', 'home'])
    expect(result).toEqual({ error: 'The page list is out of date. Reload and try again.' })
    expect(updates).toHaveLength(0)
  })

  it('rejects duplicate ids', async () => {
    const result = await actions.reorderWebsitePages('website-1', 'test-studio', ['about', 'about', 'home', 'wedding'])
    expect(result).toEqual({ error: 'The page list is out of date. Reload and try again.' })
    expect(updates).toHaveLength(0)
  })

  it('rejects an empty list', async () => {
    expect(await actions.reorderWebsitePages('website-1', 'test-studio', [])).toEqual({ error: expect.any(String) })
  })

  it('reports a failed write instead of claiming success', async () => {
    failUpdateFor = 'home'
    const result = await actions.reorderWebsitePages('website-1', 'test-studio', ['about', 'home', 'wedding', 'portfolio'])
    expect(result).toEqual({ error: 'Failed to reorder pages' })
  })

  it('passes a permission error through before reading anything', async () => {
    requireStudioPermissionMock.mockResolvedValue({ error: 'You do not have permission to perform this action' })
    expect(await actions.reorderWebsitePages('website-1', 'test-studio', ['about'])).toEqual({ error: 'You do not have permission to perform this action' })
    expect(updates).toHaveLength(0)
  })

  it('refuses when the website belongs to another studio', async () => {
    websiteRow = null
    expect(await actions.reorderWebsitePages('website-1', 'test-studio', ['about', 'home', 'wedding', 'portfolio'])).toEqual({ error: 'Website not found' })
    expect(updates).toHaveLength(0)
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildNavItems,
  buildPageTree,
  childPagePath,
  filterVisiblePages,
  getParentPath,
  hasChildPages,
  pathDepth,
  slugifyPageName,
  type TreePage,
} from '@/lib/website/page-tree'

function page(path: string, order = 0, published = true, name = path): TreePage {
  return { id: `id-${path}`, name, path, order, is_published: published }
}

describe('path helpers', () => {
  it('measures depth', () => {
    expect(pathDepth('/')).toBe(0)
    expect(pathDepth('/about')).toBe(1)
    expect(pathDepth('/portfolio/wedding')).toBe(2)
  })

  it('only depth-2 pages have a parent page', () => {
    expect(getParentPath('/')).toBeNull()
    expect(getParentPath('/about')).toBeNull()
    expect(getParentPath('/portfolio/wedding')).toBe('/portfolio')
  })

  it('builds child paths, never nesting under Home', () => {
    expect(childPagePath('/portfolio', 'wedding')).toBe('/portfolio/wedding')
    expect(childPagePath('/', 'about')).toBe('/about')
  })

  it('detects sub-pages by whole-segment prefix', () => {
    const pages = [{ path: '/portfolio-old' }, { path: '/portfolio/wedding' }]
    expect(hasChildPages(pages, '/portfolio')).toBe(true)
    expect(hasChildPages([{ path: '/portfolio-old' }], '/portfolio')).toBe(false)
    expect(hasChildPages(pages, '/')).toBe(false)
  })
})

describe('slugifyPageName', () => {
  it('produces path-safe slugs', () => {
    expect(slugifyPageName('Wedding & Engagement!')).toBe('wedding-engagement')
    expect(slugifyPageName('  Café  Shoots ')).toBe('cafe-shoots')
    expect(slugifyPageName('---')).toBe('')
    expect(slugifyPageName('')).toBe('')
  })

  it('caps the length without leaving a trailing dash', () => {
    const slug = slugifyPageName(`${'a'.repeat(59)} b`)
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('only emits characters the page path validator accepts', () => {
    expect(slugifyPageName('Mombasa — Bamburi / 2026')).toMatch(/^[a-z0-9-]*$/)
  })
})

describe('buildPageTree', () => {
  it('puts Home first and orders siblings', () => {
    const tree = buildPageTree([page('/about', 2), page('/', 5), page('/contact', 1)])
    expect(tree.map((n) => n.page.path)).toEqual(['/', '/contact', '/about'])
  })

  it('nests children under their parent in order', () => {
    const tree = buildPageTree([
      page('/portfolio', 1),
      page('/portfolio/studio', 3),
      page('/portfolio/wedding', 2),
      page('/about', 0),
    ])
    expect(tree.map((n) => n.page.path)).toEqual(['/about', '/portfolio'])
    expect(tree[1]?.children.map((c) => c.page.path)).toEqual(['/portfolio/wedding', '/portfolio/studio'])
  })

  it('promotes a child whose parent page does not exist', () => {
    const tree = buildPageTree([page('/', 0), page('/portfolio/wedding', 1)])
    expect(tree.map((n) => n.page.path)).toEqual(['/', '/portfolio/wedding'])
  })

  it('promotes pages deeper than two levels', () => {
    const tree = buildPageTree([page('/a', 0), page('/a/b', 1), page('/a/b/c', 2)])
    expect(tree[0]?.children.map((c) => c.page.path)).toEqual(['/a/b'])
    expect(tree.map((n) => n.page.path)).toEqual(['/a', '/a/b/c'])
  })

  it('does not lose any page', () => {
    const pages = [page('/', 0), page('/a', 1), page('/a/b', 2), page('/x/y', 3), page('/a/b/c', 4)]
    const tree = buildPageTree(pages)
    const flat = tree.flatMap((n) => [n.page, ...n.children.map((c) => c.page)])
    expect(flat.map((p) => p.path).sort()).toEqual(pages.map((p) => p.path).sort())
  })

  it('never nests anything under Home', () => {
    const tree = buildPageTree([page('/', 0), page('/about', 1)])
    expect(tree[0]?.children).toEqual([])
  })
})

describe('buildNavItems', () => {
  it('groups published children under a published parent', () => {
    const nav = buildNavItems([
      page('/', 0, true, 'Home'),
      page('/portfolio', 1, true, 'Portfolio'),
      page('/portfolio/wedding', 2, true, 'Wedding'),
    ])
    expect(nav).toEqual([
      { name: 'Home', path: '/' },
      { name: 'Portfolio', path: '/portfolio', children: [{ name: 'Wedding', path: '/portfolio/wedding' }] },
    ])
  })

  it('ignores drafts and promotes a child of a draft parent', () => {
    const nav = buildNavItems([
      page('/', 0, true, 'Home'),
      page('/portfolio', 1, false, 'Portfolio'),
      page('/portfolio/wedding', 2, true, 'Wedding'),
      page('/hidden', 3, false, 'Hidden'),
    ])
    expect(nav.map((n) => n.path)).toEqual(['/', '/portfolio/wedding'])
    expect(nav.every((n) => n.children === undefined)).toBe(true)
  })
})

describe('filterVisiblePages', () => {
  it('hides a published sub-page while its parent page is hidden', () => {
    const visible = filterVisiblePages([
      page('/', 0),
      page('/portfolio', 1, false),
      page('/portfolio/wedding', 2, true),
      page('/about', 3),
    ])
    expect(visible.map((p) => p.path)).toEqual(['/', '/about'])
  })

  it('shows sub-pages again once the parent is shown', () => {
    const visible = filterVisiblePages([page('/portfolio', 1), page('/portfolio/wedding', 2)])
    expect(visible.map((p) => p.path)).toEqual(['/portfolio', '/portfolio/wedding'])
  })

  it('hides a draft sub-page without touching its parent', () => {
    const visible = filterVisiblePages([page('/portfolio', 1), page('/portfolio/wedding', 2, false)])
    expect(visible.map((p) => p.path)).toEqual(['/portfolio'])
  })

  it('keeps a legacy sub-page whose parent page does not exist', () => {
    expect(filterVisiblePages([page('/', 0), page('/gear/lenses', 1)]).map((p) => p.path)).toEqual(['/', '/gear/lenses'])
  })

  it('never lists a draft page', () => {
    expect(filterVisiblePages([page('/secret', 0, false)])).toEqual([])
  })
})

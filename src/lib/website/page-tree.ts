// Page hierarchy is derived from each page's `path` rather than stored as a
// parent link: /portfolio/wedding is a child of the page at /portfolio. A
// stored parent_page_id would need its own cross-website integrity guard (a
// parent in another studio's site), while a path prefix cannot point outside
// the website because paths are unique per website.

export const MAX_PAGE_DEPTH = 2

export interface TreePage {
  id: string
  name: string
  path: string
  order: number
  is_published: boolean
}

export interface PageTreeNode<T extends TreePage> {
  page: T
  children: PageTreeNode<T>[]
}

export interface NavItem {
  name: string
  path: string
  children?: { name: string; path: string }[]
}

/** '/' is the home page (depth 0); '/a' is depth 1; '/a/b' is depth 2. */
export function pathDepth(path: string): number {
  return path.split('/').filter(Boolean).length
}

/** Only a depth-2 page has a parent page; top-level pages hang off the site root. */
export function getParentPath(path: string): string | null {
  const segments = path.split('/').filter(Boolean)
  if (segments.length < 2) return null
  return '/' + segments.slice(0, -1).join('/')
}

export function slugifyPageName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
}

export function childPagePath(parentPath: string, slug: string): string {
  return parentPath === '/' ? `/${slug}` : `${parentPath}/${slug}`
}

export function hasChildPages(pages: { path: string }[], path: string): boolean {
  if (path === '/') return false
  const prefix = `${path}/`
  return pages.some((page) => page.path.startsWith(prefix))
}

function compareByOrder(a: TreePage, b: TreePage): number {
  return a.order - b.order || a.path.localeCompare(b.path)
}

/**
 * Home first, then top-level pages by order, each followed by its children by
 * order. A page whose parent page is missing, or that is deeper than
 * MAX_PAGE_DEPTH, is promoted to the top level so it stays reachable instead of
 * silently disappearing from the editor.
 */
export function buildPageTree<T extends TreePage>(pages: T[]): PageTreeNode<T>[] {
  const byPath = new Map(pages.map((page) => [page.path, page]))
  const roots: PageTreeNode<T>[] = []
  const childrenOf = new Map<string, PageTreeNode<T>[]>()

  const sorted = [...pages].sort(compareByOrder)
  for (const page of sorted) {
    const parentPath = getParentPath(page.path)
    const parent = parentPath && pathDepth(page.path) <= MAX_PAGE_DEPTH ? byPath.get(parentPath) : undefined
    const node: PageTreeNode<T> = { page, children: [] }
    if (parent && getParentPath(parent.path) === null && parent.path !== '/') {
      const list = childrenOf.get(parent.path) ?? []
      list.push(node)
      childrenOf.set(parent.path, list)
    } else {
      roots.push(node)
    }
  }
  for (const root of roots) root.children = childrenOf.get(root.page.path) ?? []

  const home = roots.findIndex((node) => node.page.path === '/')
  if (home > 0) roots.unshift(...roots.splice(home, 1))
  return roots
}

/**
 * Navigation from published pages only. Callers run filterVisiblePages first,
 * so a sub-page under a hidden parent never gets here; a published page whose
 * parent page is missing entirely is promoted to the top level rather than dangling.
 */
export function buildNavItems(publishedPages: TreePage[]): NavItem[] {
  return buildPageTree(publishedPages.filter((page) => page.is_published)).map((node) => ({
    name: node.page.name,
    path: node.page.path,
    ...(node.children.length > 0
      ? { children: node.children.map((child) => ({ name: child.page.name, path: child.page.path })) }
      : {}),
  }))
}

/**
 * What a visitor can actually reach: a published page, and for a sub-page also
 * a shown parent. Hiding "Portfolio" therefore hides everything under it, so
 * the switch means what it says. A sub-page whose parent page does not exist
 * at all (possible on sites built before sub-pages had rules) stays visible.
 */
export function filterVisiblePages<T extends TreePage>(pages: T[]): T[] {
  const byPath = new Map(pages.map((page) => [page.path, page]))
  return pages.filter((page) => {
    if (!page.is_published) return false
    const parentPath = getParentPath(page.path)
    if (!parentPath) return true
    const parent = byPath.get(parentPath)
    return !parent || parent.is_published
  })
}

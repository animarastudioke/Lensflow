'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronRight, FileText, Home, Loader2, Plus } from 'lucide-react'
import type { WebsitePageRow } from '@/lib/actions/websites'
import { MAX_PAGE_DEPTH, buildPageTree, childPagePath, pathDepth, slugifyPageName } from '@/lib/website/page-tree'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const TOP_LEVEL = '__top__'

interface PagesPanelProps {
  pages: WebsitePageRow[]
  selectedId: string | null
  dirtyPageIds: Set<string>
  isReordering: boolean
  onSelect: (pageId: string) => void
  /** Receives every page id in the new display order. */
  onReorder: (orderedIds: string[]) => void
  onAddPage: (input: { name: string; path: string }) => Promise<boolean>
}

function flatten(tree: ReturnType<typeof buildPageTree<WebsitePageRow>>): string[] {
  return tree.flatMap((node) => [node.page.id, ...node.children.map((child) => child.page.id)])
}

export function PagesPanel({ pages, selectedId, dirtyPageIds, isReordering, onSelect, onReorder, onAddPage }: PagesPanelProps) {
  const tree = React.useMemo(() => buildPageTree(pages), [pages])
  const [isAdding, setIsAdding] = React.useState(false)
  const [name, setName] = React.useState('')
  const [parent, setParent] = React.useState<string>(TOP_LEVEL)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Only top-level pages other than Home can hold sub-pages (depth cap, and
  // nothing nests under Home).
  const parentOptions = tree.filter((node) => node.page.path !== '/' && pathDepth(node.page.path) < MAX_PAGE_DEPTH)
  const slug = slugifyPageName(name)
  const parentPage = parent === TOP_LEVEL ? undefined : pages.find((page) => page.id === parent)
  const newPath = slug ? childPagePath(parentPage?.path ?? '/', slug) : ''

  // Moving a top-level page moves its sub-pages with it; moving a sub-page only reorders within its parent.
  const moveRoot = (rootIndex: number, direction: -1 | 1) => {
    const target = rootIndex + direction
    const roots = [...tree]
    const current = roots[rootIndex]
    const other = roots[target]
    // Home always stays first.
    if (!current || !other || other.page.path === '/' || current.page.path === '/') return
    roots[rootIndex] = other
    roots[target] = current
    onReorder(flatten(roots))
  }

  const moveChild = (rootIndex: number, childIndex: number, direction: -1 | 1) => {
    const root = tree[rootIndex]
    const target = childIndex + direction
    if (!root || target < 0 || target >= root.children.length) return
    const children = [...root.children]
    const current = children[childIndex]
    const other = children[target]
    if (!current || !other) return
    children[childIndex] = other
    children[target] = current
    const roots = tree.map((node, index) => (index === rootIndex ? { ...node, children } : node))
    onReorder(flatten(roots))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !newPath) return
    setIsSubmitting(true)
    const added = await onAddPage({ name: name.trim(), path: newPath })
    setIsSubmitting(false)
    if (added) {
      setName('')
      setParent(TOP_LEVEL)
      setIsAdding(false)
    }
  }

  const row = (page: WebsitePageRow, opts: { depth: number; canUp: boolean; canDown: boolean; onUp: () => void; onDown: () => void }) => {
    const selected = page.id === selectedId
    return (
      <li key={page.id} className={cn('flex items-center gap-1 rounded-md', selected && 'bg-muted')} style={{ paddingLeft: opts.depth * 16 }}>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-current={selected ? 'page' : undefined}
          onClick={() => onSelect(page.id)}
        >
          {page.path === '/' ? <Home className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <span className="min-w-0 flex-1 truncate">{page.name}</span>
          {dirtyPageIds.has(page.id) && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" aria-label="Unsaved changes" />}
          {!page.is_published && <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Draft</span>}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
        {page.path !== '/' && (
          <div className="flex shrink-0">
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move ${page.name} up`} disabled={!opts.canUp || isReordering} onClick={opts.onUp}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move ${page.name} down`} disabled={!opts.canDown || isReordering} onClick={opts.onDown}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Pages</h2>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setIsAdding((open) => !open)} aria-expanded={isAdding}>
          <Plus className="mr-1 h-4 w-4" /> Add page
        </Button>
      </div>

      {isAdding && (
        <form onSubmit={submit} className="space-y-3 rounded-md border bg-card p-3">
          <div className="space-y-2">
            <Label htmlFor="new-page-name">Page name</Label>
            <Input id="new-page-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Weddings" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-page-parent">Place it</Label>
            <Select value={parent} onValueChange={setParent}>
              <SelectTrigger id="new-page-parent"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TOP_LEVEL}>In the main menu</SelectItem>
                {parentOptions.map((node) => <SelectItem key={node.page.id} value={node.page.id}>Under {node.page.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {newPath ? <>Address: <span className="font-mono">{newPath}</span></> : 'Use letters or numbers in the name to create an address.'}
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting || !newPath}>
              {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Add page
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {pages.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No pages yet. Add your first page.</p>
      ) : (
        <ul className="space-y-1" aria-label="Site menu">
          {tree.map((node, rootIndex) => (
            <React.Fragment key={node.page.id}>
              {row(node.page, {
                depth: 0,
                canUp: rootIndex > 1 || (rootIndex === 1 && tree[0]?.page.path !== '/'),
                canDown: rootIndex < tree.length - 1,
                onUp: () => moveRoot(rootIndex, -1),
                onDown: () => moveRoot(rootIndex, 1),
              })}
              {node.children.map((child, childIndex) =>
                row(child.page, {
                  depth: 1,
                  canUp: childIndex > 0,
                  canDown: childIndex < node.children.length - 1,
                  onUp: () => moveChild(rootIndex, childIndex, -1),
                  onDown: () => moveChild(rootIndex, childIndex, 1),
                })
              )}
            </React.Fragment>
          ))}
        </ul>
      )}
    </div>
  )
}

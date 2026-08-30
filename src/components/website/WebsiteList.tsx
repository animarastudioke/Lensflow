'use client'

import * as React from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Globe,
  Eye,
  MoreVertical,
  Trash2,
  ExternalLink,
  Layout,
  CheckCircle,
  XCircle,
  Copy,
  ArrowUpDown,
  LayoutList,
  LayoutGrid,
  BarChart3,
  Users,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { StatusBadge } from '@/components/layout/StatusBadge'
import type { WebsiteRow } from '@/lib/actions/websites'
import {
  bulkDeleteWebsites,
  bulkSetWebsiteStatus,
  deleteWebsite,
  duplicateWebsite,
  setWebsiteStatus,
} from '@/lib/actions/websites'

function homePagePath(website: WebsiteRow): string | undefined {
  const pages = website.pages ?? []
  return pages.find((p) => p.path === '/')?.path ?? pages[0]?.path
}

function previewHref(studioSlug: string, website: WebsiteRow): string | null {
  const path = homePagePath(website)
  if (path === undefined) return null
  const segments = path.split('/').filter(Boolean)
  const base = `/dashboard/${studioSlug}/website/${website.id}/preview`
  return segments.length === 0 ? base : `${base}/${segments.join('/')}`
}

function publicHref(website: WebsiteRow): string | null {
  if (website.status !== 'published' || website.password_protected) return null
  return `/portfolio/${website.subdomain}`
}

interface WebsiteListProps {
  studioSlug: string
  initialWebsites: WebsiteRow[]
}

export function WebsiteList({ studioSlug, initialWebsites }: WebsiteListProps) {
  const [websites, setWebsites] = React.useState<WebsiteRow[]>(initialWebsites)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [selectedWebsites, setSelectedWebsites] = React.useState<string[]>([])

  React.useEffect(() => {
    setWebsites(initialWebsites)
  }, [initialWebsites])

  const filteredWebsites = React.useMemo(() => {
    let result = [...websites]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        w =>
          w.name.toLowerCase().includes(query) ||
          w.subdomain.toLowerCase().includes(query) ||
          w.custom_domain?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(w => w.status === statusFilter)
    }

    result.sort((a, b) => {
      const comparison = a.updated_at.localeCompare(b.updated_at)
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [websites, searchQuery, statusFilter, sortOrder])

  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = React.useState(false)

  const confirmDelete = async (id: string) => {
    const result = await deleteWebsite(id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    setWebsites(prev => prev.filter(w => w.id !== id))
    setSelectedWebsites(prev => prev.filter(g => g !== id))
    toast.success('Website deleted')
    setDeleteConfirm(null)
  }

  const confirmBulkDelete = async () => {
    const result = await bulkDeleteWebsites(selectedWebsites, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    setWebsites(prev => prev.filter(w => !selectedWebsites.includes(w.id)))
    toast.success('Websites deleted')
    setSelectedWebsites([])
  }

  const handlePublish = async (id: string) => {
    const result = await setWebsiteStatus(id, 'published', studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setWebsites(prev => prev.map(w => w.id === id ? { ...w, status: 'published' as const, published_at: new Date().toISOString() } : w))
    toast.success('Website published')
  }

  const handleUnpublish = async (id: string) => {
    const result = await setWebsiteStatus(id, 'draft', studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setWebsites(prev => prev.map(w => w.id === id ? { ...w, status: 'draft' as const } : w))
    toast.success('Website unpublished')
  }

  const handleBulkPublish = async () => {
    const result = await bulkSetWebsiteStatus(selectedWebsites, 'published', studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setWebsites(prev => prev.map(w => selectedWebsites.includes(w.id) ? { ...w, status: 'published' as const, published_at: new Date().toISOString() } : w))
    setSelectedWebsites([])
  }

  const handleBulkUnpublish = async () => {
    const result = await bulkSetWebsiteStatus(selectedWebsites, 'draft', studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setWebsites(prev => prev.map(w => selectedWebsites.includes(w.id) ? { ...w, status: 'draft' as const } : w))
    setSelectedWebsites([])
  }

  const handleDuplicate = async (id: string) => {
    const result = await duplicateWebsite(id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Website duplicated')
    window.location.reload()
  }

  const toggleSelect = (id: string) => {
    setSelectedWebsites(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedWebsites.length === filteredWebsites.length) {
      setSelectedWebsites([])
    } else {
      setSelectedWebsites(filteredWebsites.map(w => w.id))
    }
  }

  const totalVisits = websites.reduce((sum, w) => sum + w.visits, 0)
  const totalVisitors = websites.reduce((sum, w) => sum + w.unique_visitors, 0)
  const publishedCount = websites.filter(w => w.status === 'published').length

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Total visits</span>
            <Globe className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {totalVisits.toLocaleString()}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Unique visitors</span>
            <Users className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {totalVisitors.toLocaleString()}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Published sites</span>
            <CheckCircle className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {publishedCount}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Total sites</span>
            <Layout className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {websites.length}
          </div>
        </div>
      </div>

      <PageHeader
        title="Website Builder"
        description="Create and manage your portfolio websites"
        breadcrumbs={[{ label: 'Websites' }]}
        actions={
          <Link href={`/dashboard/${studioSlug}/website/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Website
            </Button>
          </Link>
        }
      />

      {/* View Toggle & Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <LayoutList className="h-4 w-4 mr-2" />
                List
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Grid
              </Button>
            </div>
            <div className="flex-1" />
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search websites..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? <ArrowUpDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4 rotate-180" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedWebsites.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedWebsites.length} website{selectedWebsites.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkPublish}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Publish
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkUnpublish}>
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Unpublish
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Website Content */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedWebsites.length === filteredWebsites.length && filteredWebsites.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select all websites"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="hidden md:table-cell">Domain</TableHead>
                  <TableHead className="hidden md:table-cell">Template</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Pages</TableHead>
                  <TableHead className="hidden xl:table-cell">Visits</TableHead>
                  <TableHead className="hidden xl:table-cell">Visitors</TableHead>
                  <TableHead className="w-56">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWebsites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <EmptyState
                        icon={Globe}
                        title={websites.length === 0 ? 'No websites yet' : 'No websites found'}
                        description={websites.length === 0 ? 'Create your first portfolio website to get started.' : 'Try a different search or filter.'}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWebsites.map((website) => {
                    const pages = website.pages || []
                    return (
                    <TableRow key={website.id} className="hover:bg-muted/50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedWebsites.includes(website.id)}
                          onChange={() => toggleSelect(website.id)}
                          aria-label={`Select ${website.name}`}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{website.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {website.template_name} • {pages.length} pages
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          {website.custom_domain && (
                            <p className="font-mono text-sm">{website.custom_domain}</p>
                          )}
                          <p className="text-sm text-muted-foreground font-mono">
                            {website.subdomain}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{website.template_name}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <StatusBadge status={website.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {pages.filter(p => p.is_published).length}/{pages.length} published
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground font-mono tabular-nums">
                        {website.visits.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground font-mono tabular-nums">
                        {website.unique_visitors.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${website.name}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/${studioSlug}/website/${website.id}/editor`}>
                                  <Layout className="mr-2 h-4 w-4" />
                                  Edit Website
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/${studioSlug}/website/${website.id}/analytics`}>
                                  <BarChart3 className="mr-2 h-4 w-4" />
                                  Analytics
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDuplicate(website.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {website.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handlePublish(website.id)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              {website.status === 'published' && (
                                <DropdownMenuItem onClick={() => handleUnpublish(website.id)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Unpublish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirm(website.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dashboard/${studioSlug}/website/${website.id}/editor`}>
                              <Layout className="h-4 w-4" />
                            </Link>
                          </Button>
                          {previewHref(studioSlug, website) ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Preview">
                              <Link href={previewHref(studioSlug, website)!} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Add a page to preview this site">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {publicHref(website) ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View live site">
                              <Link href={publicHref(website)!} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled
                              title={
                                website.status !== 'published'
                                  ? 'Publish this site to make it live'
                                  : 'Password protection is on, so this site is not publicly reachable yet'
                              }
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )})
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        // Grid View
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWebsites.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={Globe}
                title={websites.length === 0 ? 'No websites yet' : 'No websites found'}
                description={websites.length === 0 ? 'Create your first portfolio website to get started.' : 'Try a different search or filter.'}
              />
            </div>
          ) : (
            filteredWebsites.map((website) => {
              const pages = website.pages || []
              return (
              <Card key={website.id} className="card-hover">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedWebsites.includes(website.id)}
                        onChange={() => toggleSelect(website.id)}
                        aria-label={`Select ${website.name}`}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary mt-1"
                      />
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{website.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={website.status} />
                          <Badge variant="outline" className="text-xs">{website.template_name}</Badge>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${website.name}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/${studioSlug}/website/${website.id}/editor`}>
                            <Layout className="mr-2 h-4 w-4" />
                            Edit Website
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDuplicate(website.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm(website.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="font-mono truncate max-w-[200px]">
                      {website.custom_domain || website.subdomain}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span className="font-mono tabular-nums">{website.visits.toLocaleString()}</span> visits
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-mono tabular-nums">{website.unique_visitors.toLocaleString()}</span> visitors
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{pages.filter(p => p.is_published).length}/{pages.length} pages published</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/${studioSlug}/website/${website.id}/editor`}>
                          <Layout className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Link>
                      </Button>
                      {previewHref(studioSlug, website) && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={previewHref(studioSlug, website)!} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Preview
                          </Link>
                        </Button>
                      )}
                      {website.status === 'draft' ? (
                        <Button variant="default" size="sm" onClick={() => handlePublish(website.id)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Publish
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleUnpublish(website.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Unpublish
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredWebsites.length} of {websites.length} websites
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete website"
        description="Are you sure you want to delete this website? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (deleteConfirm) await confirmDelete(deleteConfirm) }}
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        title={`Delete ${selectedWebsites.length} website${selectedWebsites.length !== 1 ? 's' : ''}`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Delete,
  Share2,
  Image as ImageIcon,
  Calendar,
  Users,
  Heart,
  Lock,
  LayoutGrid,
  LayoutList,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { deleteGallery, updateGalleryStatus } from '@/lib/actions/galleries'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { ViewToggle } from '@/components/layout/ViewToggle'
import { StatusBadge } from '@/components/layout/StatusBadge'

export interface Gallery {
  id: string
  name: string
  description?: string
  coverImage?: string
  status: 'draft' | 'published' | 'archived' | 'private'
  type: 'event' | 'portrait' | 'wedding' | 'commercial' | 'other'
  clientId?: string
  clientName?: string
  shootDate?: string
  mediaCount: number
  viewCount: number
  downloadCount: number
  createdAt: string
  updatedAt: string
  shareToken?: string
  passwordProtected: boolean
  expiresAt?: string
}

const typeIcons = {
  wedding: <Heart className="h-3.5 w-3.5" />,
  portrait: <Users className="h-3.5 w-3.5" />,
  commercial: <ImageIcon className="h-3.5 w-3.5" />,
  event: <Calendar className="h-3.5 w-3.5" />,
  other: <ImageIcon className="h-3.5 w-3.5" />,
}

interface GalleryListProps {
  studioSlug: string
  initialGalleries?: Gallery[]
  isLoading?: boolean
}

export function GalleryList({ studioSlug, initialGalleries, isLoading = false }: GalleryListProps) {
  const [galleries, setGalleries] = React.useState<Gallery[]>(initialGalleries ?? [])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<string>('updatedAt')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid')
  const [selectedGalleries, setSelectedGalleries] = React.useState<string[]>([])
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Filter and sort galleries
  const filteredGalleries = React.useMemo(() => {
    let result = [...galleries]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        g =>
          g.name.toLowerCase().includes(query) ||
          g.clientName?.toLowerCase().includes(query) ||
          g.description?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(g => g.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      result = result.filter(g => g.type === typeFilter)
    }

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof Gallery]
      const bVal = b[sortBy as keyof Gallery]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [galleries, searchQuery, statusFilter, typeFilter, sortBy, sortOrder])

  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== 'all' || typeFilter !== 'all'

  const handleDelete = (id: string) => {
    setDeleteConfirm(id)
  }

  const removeGallery = async (id: string): Promise<{ error: string } | { success: true }> => {
    try {
      await deleteGallery(id, studioSlug)
      return { success: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete gallery' }
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    const id = deleteConfirm
    const result = await removeGallery(id)
    if ('error' in result) {
      toast.error(result.error)
      // Re-thrown so ConfirmDialog keeps the dialog open on failure instead
      // of closing as if the delete had succeeded.
      throw new Error(result.error)
    }
    setGalleries(prev => prev.filter(g => g.id !== id))
    setSelectedGalleries(prev => prev.filter(g => g !== id))
    toast.success('Gallery deleted')
  }

  const handleBulkAction = async (action: 'delete' | 'archive' | 'publish') => {
    if (selectedGalleries.length === 0 || isProcessing) return
    setIsProcessing(true)

    const status: Gallery['status'] = action === 'archive' ? 'archived' : 'published'
    const results = await Promise.all(
      selectedGalleries.map((id) =>
        action === 'delete' ? removeGallery(id) : updateGalleryStatus(id, studioSlug, status)
      )
    )
    const failed = results.filter((r) => 'error' in r).length
    const succeededIds = selectedGalleries.filter((_, i) => !('error' in results[i]!))

    if (action === 'delete') {
      setGalleries(prev => prev.filter(g => !succeededIds.includes(g.id)))
    } else {
      setGalleries(prev =>
        prev.map(g => (succeededIds.includes(g.id) ? { ...g, status } : g))
      )
    }
    setSelectedGalleries(prev => prev.filter((id) => !succeededIds.includes(id)))

    if (failed > 0) {
      toast.error(`${failed} of ${selectedGalleries.length} galleries couldn't be updated`)
    } else {
      toast.success(action === 'delete' ? 'Galleries deleted' : action === 'archive' ? 'Galleries archived' : 'Galleries published')
    }
    setIsProcessing(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedGalleries(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedGalleries.length === filteredGalleries.length) {
      setSelectedGalleries([])
    } else {
      setSelectedGalleries(filteredGalleries.map(g => g.id))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded mt-2" />
              </CardHeader>
              <div className="aspect-video bg-muted" />
              <CardContent>
                <div className="h-4 w-full bg-muted rounded mb-2" />
                <div className="h-3 w-2/3 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const viewToggleOptions = [
    { value: 'grid' as const, label: 'Grid view', icon: LayoutGrid },
    { value: 'table' as const, label: 'Table view', icon: LayoutList },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Galleries"
        description="Client galleries for proofing, favorites, and downloads"
        actions={
          <Link href={`/dashboard/${studioSlug}/galleries/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Gallery
            </Button>
          </Link>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {selectedGalleries.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg text-primary text-sm font-medium">
            {selectedGalleries.length} selected
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedGalleries([])} aria-label="Clear selection">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search galleries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-10 w-64 pl-10 pr-4"
              aria-label="Search galleries"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="wedding">Wedding</SelectItem>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ViewToggle value={viewMode} onValueChange={setViewMode} options={viewToggleOptions} />
        </div>
      </div>

      {/* Bulk actions */}
      {selectedGalleries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-medium text-muted-foreground">
            {selectedGalleries.length} selected
          </span>
          <Button variant="outline" size="sm" disabled={isProcessing} onClick={() => handleBulkAction('publish')}>
            Publish
          </Button>
          <Button variant="outline" size="sm" disabled={isProcessing} onClick={() => handleBulkAction('archive')}>
            Archive
          </Button>
          <Button variant="destructive" size="sm" disabled={isProcessing} onClick={() => handleBulkAction('delete')}>
            <Delete className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      )}

      {/* Gallery Grid View */}
      {viewMode === 'grid' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGalleries.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={ImageIcon}
                title="No galleries found"
                description={
                  hasActiveFilters
                    ? 'Try adjusting your filters or search query.'
                    : 'Create a gallery to start sharing proofs, favorites, and downloads with a client.'
                }
                action={
                  hasActiveFilters
                    ? undefined
                    : { label: 'Create Gallery', href: `/dashboard/${studioSlug}/galleries/new` }
                }
              />
            </div>
          ) : (
            filteredGalleries.map(gallery => (
              <GalleryCard
                key={gallery.id}
                gallery={gallery}
                studioSlug={studioSlug}
                selected={selectedGalleries.includes(gallery.id)}
                onSelect={toggleSelect}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}

      {/* Gallery Table View */}
      {viewMode === 'table' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedGalleries.length === filteredGalleries.length && filteredGalleries.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all galleries"
                    className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                  />
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => {
                      if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      else setSortBy('name')
                    }}
                    className="flex items-center gap-1 text-left font-medium hover:text-foreground transition-colors"
                  >
                    Gallery
                    {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => {
                      if (sortBy === 'clientName') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      else setSortBy('clientName')
                    }}
                    className="flex items-center gap-1 text-left font-medium hover:text-foreground transition-colors hidden md:table-cell"
                  >
                    Client
                    {sortBy === 'clientName' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <button
                    onClick={() => {
                      if (sortBy === 'type') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      else setSortBy('type')
                    }}
                    className="flex items-center gap-1 text-left font-medium hover:text-foreground transition-colors"
                  >
                    Type
                    {sortBy === 'type' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <button
                    onClick={() => {
                      if (sortBy === 'shootDate') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      else setSortBy('shootDate')
                    }}
                    className="flex items-center gap-1 text-left font-medium hover:text-foreground transition-colors"
                  >
                    Shoot Date
                    {sortBy === 'shootDate' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <button
                    onClick={() => {
                      if (sortBy === 'mediaCount') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      else setSortBy('mediaCount')
                    }}
                    className="flex items-center gap-1 text-left font-medium hover:text-foreground transition-colors"
                  >
                    Photos
                    {sortBy === 'mediaCount' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="hidden xl:table-cell">
                  <button
                    onClick={() => {
                      if (sortBy === 'viewCount') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      else setSortBy('viewCount')
                    }}
                    className="flex items-center gap-1 text-left font-medium hover:text-foreground transition-colors"
                  >
                    Views
                    {sortBy === 'viewCount' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => {
                      if (sortBy === 'status') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      else setSortBy('status')
                    }}
                    className="flex items-center gap-1 text-left font-medium hover:text-foreground transition-colors"
                  >
                    Status
                    {sortBy === 'status' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGalleries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <EmptyState
                      icon={ImageIcon}
                      title="No galleries found"
                      description={
                        hasActiveFilters
                          ? 'Try adjusting your filters or search query.'
                          : 'Create a gallery to start sharing proofs, favorites, and downloads with a client.'
                      }
                      action={
                        hasActiveFilters
                          ? undefined
                          : { label: 'Create Gallery', href: `/dashboard/${studioSlug}/galleries/new` }
                      }
                      compact
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredGalleries.map(gallery => (
                  <TableRow key={gallery.id} className={cn(selectedGalleries.includes(gallery.id) && 'bg-primary/5')}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedGalleries.includes(gallery.id)}
                        onChange={() => toggleSelect(gallery.id)}
                        aria-label={`Select ${gallery.name}`}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}`} className="font-medium hover:underline">
                        {gallery.name}
                      </Link>
                      {gallery.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs mt-1">{gallery.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {gallery.clientName ? (
                        <Link href={`/dashboard/${studioSlug}/clients/${gallery.clientId}`} className="hover:underline">
                          {gallery.clientName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="flex items-center gap-1">
                        {typeIcons[gallery.type as keyof typeof typeIcons]}
                        <span className="capitalize">{gallery.type}</span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {gallery.shootDate ? format(new Date(gallery.shootDate), 'MMM d, yyyy') : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {gallery.mediaCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {gallery.viewCount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <StatusBadge status={gallery.status} />
                        {gallery.passwordProtected && <Lock className="h-3 w-3 text-muted-foreground" aria-label="Password protected" />}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{gallery.name}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Gallery
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/g/${gallery.shareToken}`} target="_blank">
                              <Share2 className="mr-2 h-4 w-4" />
                              Open Client View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {gallery.status !== 'archived' && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(gallery.id)}>
                              <Delete className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete gallery"
        description={`Are you sure you want to delete "${galleries.find(g => g.id === deleteConfirm)?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  )
}

interface GalleryCardProps {
  gallery: Gallery
  studioSlug: string
  selected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function GalleryCard({
  gallery,
  studioSlug,
  selected,
  onSelect,
  onDelete,
}: GalleryCardProps) {
  const isExpired = gallery.expiresAt && new Date(gallery.expiresAt) < new Date()

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-colors duration-150',
        selected && 'border-primary'
      )}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 z-10 opacity-0 transition-opacity group-hover:opacity-100 has-[:checked]:opacity-100">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(gallery.id)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary bg-background"
          aria-label={`Select ${gallery.name}`}
        />
      </div>

      {/* Cover image - full bleed print, no text overlaid on the photo */}
      <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}`} className="block">
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          {gallery.coverImage ? (
            <img
              src={gallery.coverImage}
              alt={gallery.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground/40">
              <ImageIcon className="h-10 w-10" strokeWidth={1.5} />
            </div>
          )}
        </div>
      </Link>

      {/* Wall label: caption block below the print, not overlaid on it */}
      <div className="border-t border-border p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}`} className="min-w-0">
            <h3 className="font-medium text-foreground truncate hover:underline">{gallery.name}</h3>
          </Link>
          {gallery.passwordProtected && (
            <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={1.5} aria-label="Password protected" />
          )}
        </div>
        {gallery.clientName && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{gallery.clientName}</p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <StatusBadge status={gallery.status} />
          <span className="flex items-center gap-1 label-caption normal-case tracking-normal font-sans text-xs text-muted-foreground">
            {typeIcons[gallery.type as keyof typeof typeIcons]}
            {gallery.type}
          </span>
          {isExpired && <span className="label-caption normal-case tracking-normal font-sans text-xs text-destructive">Expired</span>}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {gallery.shootDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" strokeWidth={1.5} />
              {format(new Date(gallery.shootDate), 'MMM d, yyyy')}
            </span>
          )}
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" strokeWidth={1.5} />
            {gallery.mediaCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" strokeWidth={1.5} />
            {gallery.viewCount.toLocaleString()}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}/edit`} className="text-sm text-muted-foreground hover:text-foreground">
              Edit
            </Link>
            <Link href={`/g/${gallery.shareToken}`} target="_blank" className="text-sm text-muted-foreground hover:text-foreground">
              Share
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDelete(gallery.id)}
            aria-label="Delete gallery"
          >
            <Delete className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
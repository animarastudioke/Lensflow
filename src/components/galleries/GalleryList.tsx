'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Delete,
  Share2,
  Download,
  Settings,
  Image as ImageIcon,
  Calendar,
  Users,
  Lock,
  Globe,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'

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

const mockGalleries: Gallery[] = [
  {
    id: '1',
    name: 'Smith Wedding',
    description: 'Beautiful wedding ceremony and reception photos',
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    status: 'published',
    type: 'wedding',
    clientId: '1',
    clientName: 'Sarah & John Smith',
    shootDate: '2024-06-15',
    mediaCount: 847,
    viewCount: 1234,
    downloadCount: 567,
    createdAt: '2024-06-10',
    updatedAt: '2024-06-16',
    shareToken: 'abc123',
    passwordProtected: true,
    expiresAt: '2025-06-15',
  },
  {
    id: '2',
    name: 'Johnson Family Portraits',
    description: 'Annual family portrait session',
    coverImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400',
    status: 'published',
    type: 'portrait',
    clientId: '2',
    clientName: 'Marcus Johnson',
    shootDate: '2024-05-20',
    mediaCount: 156,
    viewCount: 456,
    downloadCount: 123,
    createdAt: '2024-05-18',
    updatedAt: '2024-05-22',
    shareToken: 'def456',
    passwordProtected: false,
  },
  {
    id: '3',
    name: 'Corporate Headshots - TechCorp',
    description: 'Executive and team headshots for annual report',
    coverImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400',
    status: 'draft',
    type: 'commercial',
    clientId: '3',
    clientName: 'TechCorp Inc.',
    shootDate: '2024-07-01',
    mediaCount: 89,
    viewCount: 0,
    downloadCount: 0,
    createdAt: '2024-06-25',
    updatedAt: '2024-06-28',
    passwordProtected: true,
  },
  {
    id: '4',
    name: 'Summer Mini Sessions',
    description: 'Outdoor mini sessions at Central Park',
    coverImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
    status: 'archived',
    type: 'portrait',
    shootDate: '2024-07-15',
    mediaCount: 234,
    viewCount: 567,
    downloadCount: 234,
    createdAt: '2024-07-01',
    updatedAt: '2024-07-20',
    shareToken: 'ghi789',
    passwordProtected: false,
    expiresAt: '2024-08-15',
  },
]

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  private: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

const statusIcons = {
  draft: <Settings className="h-3.5 w-3.5" />,
  published: <Globe className="h-3.5 w-3.5" />,
  archived: <Lock className="h-3.5 w-3.5" />,
  private: <Eye className="h-3.5 w-3.5" />,
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

export function GalleryList({ studioSlug, initialGalleries = [], isLoading = false }: GalleryListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [galleries, setGalleries] = React.useState<Gallery[]>(initialGalleries.length > 0 ? initialGalleries : mockGalleries)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<string>('updatedAt')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid')
  const [selectedGalleries, setSelectedGalleries] = React.useState<string[]>([])
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)

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
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [galleries, searchQuery, statusFilter, typeFilter, sortBy, sortOrder])

  const handleDelete = (id: string) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = (id: string) => {
    setGalleries(prev => prev.filter(g => g.id !== id))
    setDeleteConfirm(null)
    setSelectedGalleries(prev => prev.filter(g => g.id !== id))
  }

  const handleBulkAction = (action: 'delete' | 'archive' | 'publish' | 'download') => {
    if (selectedGalleries.length === 0) return

    switch (action) {
      case 'delete':
        setGalleries(prev => prev.filter(g => !selectedGalleries.includes(g.id)))
        setSelectedGalleries([])
        break
      case 'archive':
        setGalleries(prev =>
          prev.map(g =>
            selectedGalleries.includes(g.id) ? { ...g, status: 'archived' as const } : g
          )
        )
        setSelectedGalleries([])
        break
      case 'publish':
        setGalleries(prev =>
          prev.map(g =>
            selectedGalleries.includes(g.id) ? { ...g, status: 'published' as const } : g
          )
        )
        setSelectedGalleries([])
        break
      case 'download':
        // Trigger bulk download
        console.log('Downloading galleries:', selectedGalleries)
        break
    }
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

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-heading-lg font-semibold">Galleries</h2>
          {selectedGalleries.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg text-primary text-sm font-medium">
              {selectedGalleries.length} selected
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedGalleries([])}>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {/* View mode toggle */}
          <div className="flex bg-muted rounded-lg p-1" role="group" aria-label="View mode">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <div className="grid grid-cols-2 gap-1">
                <div className="h-3 w-3 bg-current/50 rounded" />
                <div className="h-3 w-3 bg-current/50 rounded" />
                <div className="h-3 w-3 bg-current/50 rounded" />
                <div className="h-3 w-3 bg-current/50 rounded" />
              </div>
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              aria-pressed={viewMode === 'table'}
            >
              <Table className="h-5 w-5" />
            </Button>
          </div>

          {/* Create gallery button */}
          <Link href={`/dashboard/${studioSlug}/galleries/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Gallery
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedGalleries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-medium text-muted-foreground">
            {selectedGalleries.length} selected
          </span>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction('publish')}>
            Publish
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction('archive')}>
            Archive
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction('download')}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Download
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleBulkAction('delete')}>
            <Delete className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      )}

      {/* Gallery Grid View */}
      {viewMode === 'grid' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGalleries.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-heading text-muted-foreground">No galleries found</h3>
              <p className="text-body-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first gallery to get started'}
              </p>
              {(!searchQuery && statusFilter === 'all' && typeFilter === 'all') && (
                <Link href={`/dashboard/${studioSlug}/galleries/new`} className="mt-4 inline-block">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Gallery
                  </Button>
                </Link>
              )}
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
                deleteConfirm={deleteConfirm === gallery.id}
                onConfirmDelete={confirmDelete}
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
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
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
                  <TableCell colSpan={9} className="text-center py-12">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-body text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                        ? 'No galleries match your filters'
                        : 'No galleries yet. Create your first gallery!'}
                    </p>
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
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
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
                      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', statusColors[gallery.status])}>
                        {statusIcons[gallery.status as keyof typeof statusIcons]}
                        {gallery.status.charAt(0).toUpperCase() + gallery.status.slice(1)}
                        {gallery.passwordProtected && <Lock className="h-3 w-3" />}
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
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}/settings`}>
                              <Settings className="mr-2 h-4 w-4" />
                              Settings
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

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete Gallery</CardTitle>
              <CardDescription>
                Are you sure you want to delete "{galleries.find(g => g.id === deleteConfirm)?.name}"?
                This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => confirmDelete(deleteConfirm)}>Delete</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}

interface GalleryCardProps {
  gallery: Gallery
  studioSlug: string
  selected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  deleteConfirm: boolean
  onConfirmDelete: (id: string) => void
}

function GalleryCard({
  gallery,
  studioSlug,
  selected,
  onSelect,
  onDelete,
  deleteConfirm,
  onConfirmDelete,
}: GalleryCardProps) {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        selected && 'ring-2 ring-primary ring-offset-2 bg-primary/5'
      )}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 right-2 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(gallery.id)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary bg-background"
          aria-label={`Select ${gallery.name}`}
        />
      </div>

      {/* Cover image */}
      <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}`} className="block">
        <div className="aspect-video relative overflow-hidden bg-muted">
          {gallery.coverImage ? (
            <img
              src={gallery.coverImage}
              alt={gallery.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground/50">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-2 left-2">
            <span className={cn('px-2 py-1 rounded text-xs font-medium', statusColors[gallery.status])}>
              {gallery.status.charAt(0).toUpperCase() + gallery.status.slice(1)}
            </span>
          </div>

          {/* Type badge */}
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/50 rounded text-xs text-white">
            {typeIcons[gallery.type as keyof typeof typeIcons]}
          </div>

          {/* Password protected indicator */}
          {gallery.passwordProtected && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/50 rounded text-xs text-white">
              <Lock className="h-3 w-3" />
              Protected
            </div>
          )}

          {/* Expiry warning */}
          {gallery.expiresAt && new Date(gallery.expiresAt) < new Date() && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-destructive/90 rounded text-xs text-white">
              Expired
            </div>
          )}
        </div>
      </Link>

      <CardHeader className="pt-3 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold truncate">{gallery.name}</h3>
            {gallery.passwordProtected && <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
          </div>
        </div>
        {gallery.clientName && (
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {gallery.clientName}
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-0">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {gallery.shootDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(gallery.shootDate), 'MMM d, yyyy')}
            </span>
          )}
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {gallery.mediaCount.toLocaleString()} photos
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {gallery.viewCount.toLocaleString()} views
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1">
          <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}`} className="text-sm text-primary hover:underline">
            View
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}/edit`} className="text-sm text-muted-foreground hover:text-foreground">
            Edit
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href={`/g/${gallery.shareToken}`} target="_blank" className="text-sm text-muted-foreground hover:text-foreground">
            Share
          </Link>
        </div>
        {deleteConfirm ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onConfirmDelete(gallery.id)}>
              Confirm
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(gallery.id)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDelete(gallery.id)}
            aria-label="Delete gallery"
          >
            <Delete className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
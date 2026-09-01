'use client'

import * as React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
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
  Plus,
  Search,
  Calendar,
  Image,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Briefcase,
  ArrowUpDown,
  LayoutList,
  LayoutGrid,
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
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/currencies'
import { deleteProject, archiveProjects, type ProjectStatus as ServerProjectStatus } from '@/lib/actions/projects'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { ViewToggle } from '@/components/layout/ViewToggle'
import { StatusBadge } from '@/components/layout/StatusBadge'

interface Project {
  id: string
  clientId: string
  clientName: string
  clientEmail: string
  title: string
  type: 'wedding' | 'portrait' | 'engagement' | 'family' | 'corporate' | 'event' | 'commercial' | 'other'
  status: ServerProjectStatus
  startDate: string
  endDate?: string
  location: string
  totalValue: number
  paidAmount: number
  balanceDue: number
  notes?: string
  createdAt: string
  updatedAt: string
}

function getTypeLabel(type: Project['type']) {
  const typeLabels = {
    wedding: 'Wedding',
    portrait: 'Portrait',
    engagement: 'Engagement',
    family: 'Family',
    corporate: 'Corporate',
    event: 'Event',
    commercial: 'Commercial',
    other: 'Other',
  }
  return typeLabels[type]
}

const VIEW_OPTIONS = [
  { value: 'table' as const, label: 'List', icon: LayoutList },
  { value: 'grid' as const, label: 'Grid', icon: LayoutGrid },
]

interface ProjectListProps {
  studioSlug: string
  initialProjects?: Project[]
  isLoading?: boolean
  currency?: string
}

export function ProjectList({ studioSlug, initialProjects, isLoading = false, currency = 'USD' }: ProjectListProps) {
  const [projects, setProjects] = React.useState<Project[]>(initialProjects ?? [])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [sortBy] = React.useState<string>('startDate')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [selectedProjects, setSelectedProjects] = React.useState<string[]>([])
  const [isBulkPending, setIsBulkPending] = React.useState(false)

  // Filter and sort projects
  const filteredProjects = React.useMemo(() => {
    let result = [...projects]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(query) ||
          p.clientName.toLowerCase().includes(query) ||
          p.clientEmail.toLowerCase().includes(query) ||
          p.location.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      result = result.filter(p => p.type === typeFilter)
    }

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof Project]
      const bVal = b[sortBy as keyof Project]
      if (aVal === undefined || bVal === undefined) return 0
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [projects, searchQuery, statusFilter, typeFilter, sortBy, sortOrder])

  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = React.useState(false)
  const hasFilters = searchQuery !== '' || statusFilter !== 'all' || typeFilter !== 'all'

  const handleDelete = (id: string) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = async (id: string) => {
    const result = await deleteProject(id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    setProjects(prev => prev.filter(p => p.id !== id))
    setSelectedProjects(prev => prev.filter(g => g !== id))
  }

  const confirmBulkDelete = async () => {
    const ids = selectedProjects
    const results = await Promise.all(ids.map(async (id) => ({ id, result: await deleteProject(id, studioSlug) })))
    const succeededIds = results.filter(r => !r.result?.error).map(r => r.id)
    const failedCount = results.length - succeededIds.length
    setProjects(prev => prev.filter(p => !succeededIds.includes(p.id)))
    setSelectedProjects(prev => prev.filter(id => !succeededIds.includes(id)))
    if (failedCount > 0) {
      toast.error(`${failedCount} project${failedCount !== 1 ? 's' : ''} could not be deleted`)
      throw new Error('partial bulk delete failure')
    }
  }

  const handleBulkAction = async (action: 'delete' | 'archive') => {
    if (selectedProjects.length === 0) return

    if (action === 'delete') {
      setBulkDeleteConfirm(true)
      return
    }

    const ids = selectedProjects
    setIsBulkPending(true)
    const result = await archiveProjects(ids, studioSlug)
    setIsBulkPending(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setProjects(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'archived' as const } : p))
    setSelectedProjects([])
  }

  const toggleSelect = (id: string) => {
    setSelectedProjects(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedProjects.length === filteredProjects.length) {
      setSelectedProjects([])
    } else {
      setSelectedProjects(filteredProjects.map(p => p.id))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="animate-pulse">
          <div className="h-12 bg-muted rounded-lg" />
          <div className="space-y-3 mt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track shoots, deliverables, and progress"
        actions={
          <Link href={`/dashboard/${studioSlug}/projects/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        }
      />

      {/* View Toggle & Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <ViewToggle value={viewMode} onValueChange={setViewMode} options={VIEW_OPTIONS} />

            <div className="flex-1" />

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="editing">Editing</SelectItem>
                  <SelectItem value="review">Client Review</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}>
                {sortOrder === 'asc' ? <ArrowUpDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4 rotate-180" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedProjects.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={isBulkPending} onClick={() => handleBulkAction('archive')}>
                  Archive
                </Button>
                <Button variant="destructive" size="sm" disabled={isBulkPending} onClick={() => handleBulkAction('delete')}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Content */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Briefcase}
              title={projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
              description={
                projects.length === 0
                  ? 'Create your first project to start tracking shoots and deliverables.'
                  : 'Try adjusting your search or filters.'
              }
              action={projects.length === 0 ? { label: 'New Project', href: `/dashboard/${studioSlug}/projects/new` } : undefined}
              secondaryAction={hasFilters ? { label: 'Clear filters', onClick: () => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all') } } : undefined}
            />
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedProjects.length === filteredProjects.length && filteredProjects.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select all projects"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Dates</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="text-right hidden xl:table-cell">Value</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-muted/50">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(project.id)}
                        onChange={() => toggleSelect(project.id)}
                        aria-label={`Select ${project.title}`}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{project.title}</p>
                      <p className="text-sm text-muted-foreground">{project.location}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" alt={project.clientName} />
                          <AvatarFallback className="text-xs">
                            {project.clientName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{project.clientName}</p>
                          <p className="text-xs text-muted-foreground">{project.clientEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{format(new Date(project.startDate), 'MMM d, yyyy')}</span>
                        </div>
                        {project.endDate && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>to {format(new Date(project.endDate), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{getTypeLabel(project.type)}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <StatusBadge status={project.status} />
                    </TableCell>
                    <TableCell className="text-right hidden xl:table-cell font-mono tabular-nums">
                      {project.balanceDue > 0 ? (
                        <span className="text-destructive">{formatCurrency(project.balanceDue, currency)} due</span>
                      ) : project.totalValue > 0 ? (
                        <span className="text-success font-sans">Paid in full</span>
                      ) : (
                        <span className="text-muted-foreground font-sans">Not yet billed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${project.title}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/${studioSlug}/projects/${project.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/${studioSlug}/projects/${project.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/${studioSlug}/galleries/new?project=${project.id}`}>
                              <Image className="mr-2 h-4 w-4" />
                              Create Gallery
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(project.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        // Grid View
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => toggleSelect(project.id)}
                      aria-label={`Select ${project.title}`}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                    />
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{project.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={project.status} />
                        <Badge variant="outline" className="text-xs">{getTypeLabel(project.type)}</Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${project.title}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/${studioSlug}/projects/${project.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/${studioSlug}/projects/${project.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(project.id)}
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
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(project.startDate), 'MMM d, yyyy')}</span>
                  {project.endDate && (
                    <>
                      <span>→</span>
                      <span>{format(new Date(project.endDate), 'MMM d, yyyy')}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground font-mono tabular-nums">
                    {formatCurrency(project.paidAmount, currency)} / {formatCurrency(project.totalValue, currency)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/${studioSlug}/galleries/new?project=${project.id}`}>
                        <Image className="h-3.5 w-3.5 mr-1.5" />
                        Gallery
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/${studioSlug}/projects/${project.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredProjects.length} of {projects.length} projects
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (deleteConfirm) await confirmDelete(deleteConfirm) }}
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        title={`Delete ${selectedProjects.length} project${selectedProjects.length !== 1 ? 's' : ''}`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

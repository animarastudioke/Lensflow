'use client'

import * as React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
  Video,
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
import { Progress } from '@/components/ui/progress'

interface Project {
  id: string
  clientId: string
  clientName: string
  clientEmail: string
  title: string
  type: 'wedding' | 'portrait' | 'engagement' | 'family' | 'corporate' | 'event' | 'commercial' | 'other'
  status: 'planning' | 'scheduled' | 'in-progress' | 'editing' | 'review' | 'delivered' | 'archived'
  startDate: string
  endDate?: string
  location: string
  progress: number
  deliverables: {
    photos: number
    videos: number
    albums: number
  }
  totalValue: number
  paidAmount: number
  balanceDue: number
  tags: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

const mockProjects: Project[] = [
  {
    id: '1',
    clientId: '1',
    clientName: 'Sarah Chen',
    clientEmail: 'sarah.chen@email.com',
    title: 'Chen Wedding',
    type: 'wedding',
    status: 'editing',
    startDate: '2024-06-15',
    endDate: '2024-08-15',
    location: 'Golden Gate Park, SF',
    progress: 65,
    deliverables: { photos: 850, videos: 2, albums: 1 },
    totalValue: 4500,
    paidAmount: 1500,
    balanceDue: 3000,
    tags: ['wedding', 'premium', 'summer'],
    notes: '8 hours coverage. 850+ edited photos. Highlight video + full ceremony.',
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2024-07-20T14:30:00Z',
  },
  {
    id: '2',
    clientId: '2',
    clientName: 'Marcus Johnson',
    clientEmail: 'marcus.j@email.com',
    title: 'Johnson Family Portraits',
    type: 'family',
    status: 'review',
    startDate: '2024-02-10',
    endDate: '2024-03-01',
    location: 'Studio',
    progress: 90,
    deliverables: { photos: 75, videos: 0, albums: 1 },
    totalValue: 800,
    paidAmount: 200,
    balanceDue: 600,
    tags: ['family', 'studio', 'spring'],
    notes: '2 adults, 2 kids. Outdoor + studio. Digital gallery + 8x10 album.',
    createdAt: '2024-01-05T15:00:00Z',
    updatedAt: '2024-02-15T09:00:00Z',
  },
  {
    id: '3',
    clientId: '3',
    clientName: 'Emily Rodriguez',
    clientEmail: 'emily.r@email.com',
    title: 'Rodriguez Engagement',
    type: 'engagement',
    status: 'planning',
    startDate: '2024-03-20',
    location: 'Mount Tamalpais',
    progress: 10,
    deliverables: { photos: 0, videos: 0, albums: 0 },
    totalValue: 600,
    paidAmount: 0,
    balanceDue: 600,
    tags: ['engagement', 'outdoor', 'sunset'],
    notes: 'Sunset session. Dog included. 2 hours.',
    createdAt: '2024-01-12T11:00:00Z',
    updatedAt: '2024-01-12T11:00:00Z',
  },
  {
    id: '4',
    clientId: '4',
    clientName: 'David Park',
    clientEmail: 'david.park@email.com',
    title: 'Park Corporate Headshots',
    type: 'corporate',
    status: 'delivered',
    startDate: '2024-01-08',
    endDate: '2024-01-22',
    location: 'Client Office',
    progress: 100,
    deliverables: { photos: 150, videos: 0, albums: 0 },
    totalValue: 1200,
    paidAmount: 1200,
    balanceDue: 0,
    tags: ['corporate', 'headshots', 'delivered'],
    notes: '15 employees. White backdrop. 48hr delivery. All delivered.',
    createdAt: '2023-11-20T10:00:00Z',
    updatedAt: '2024-01-22T13:00:00Z',
  },
]

function getStatusBadge(status: Project['status']) {
  const statusConfig = {
    planning: { label: 'Planning', variant: 'secondary' as const },
    scheduled: { label: 'Scheduled', variant: 'info' as const },
    'in-progress': { label: 'In Progress', variant: 'default' as const },
    editing: { label: 'Editing', variant: 'warning' as const },
    review: { label: 'Client Review', variant: 'outline' as const },
    delivered: { label: 'Delivered', variant: 'success' as const },
    archived: { label: 'Archived', variant: 'secondary' as const },
  }
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
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

interface ProjectListProps {
  studioSlug: string
  initialProjects?: Project[]
  isLoading?: boolean
}

export function ProjectList({ studioSlug, initialProjects, isLoading = false }: ProjectListProps) {
  const [projects, setProjects] = React.useState<Project[]>(initialProjects ?? mockProjects)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [sortBy] = React.useState<string>('startDate')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [selectedProjects, setSelectedProjects] = React.useState<string[]>([])

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

  const handleDelete = (id: string) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setSelectedProjects(prev => prev.filter(g => g !== id))
    setDeleteConfirm(null)
  }

  const confirmBulkDelete = () => {
    setProjects(prev => prev.filter(p => !selectedProjects.includes(p.id)))
    setSelectedProjects([])
    setBulkDeleteConfirm(false)
  }

  const handleBulkAction = (action: 'delete' | 'archive') => {
    if (selectedProjects.length === 0) return

    switch (action) {
      case 'delete':
        setBulkDeleteConfirm(true)
        break
      case 'archive':
        setProjects(prev =>
          prev.map(p =>
            selectedProjects.includes(p.id) ? { ...p, status: 'archived' as const } : p
          )
        )
        setSelectedProjects([])
        break
    }
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display font-semibold text-foreground">Projects</h1>
          <p className="text-body text-muted-foreground mt-1">Track shoots, deliverables, and progress</p>
        </div>
        <Link href={`/dashboard/${studioSlug}/projects/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* View Toggle & Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* View Toggle */}
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
                  <SelectItem value="in-progress">In Progress</SelectItem>
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
              <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
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
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('archive')}>
                  Archive
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleBulkAction('delete')}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Content */}
      {viewMode === 'table' ? (
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
                  <TableHead className="hidden xl:table-cell">Progress</TableHead>
                  <TableHead className="text-right hidden xl:table-cell">Value</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No projects found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
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
                        {getStatusBadge(project.status)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="w-32">
                          <Progress value={project.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">{project.progress}% complete</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden xl:table-cell font-mono tabular-nums">
                        {project.balanceDue > 0 ? (
                          <span className="text-destructive">${project.balanceDue.toLocaleString()} due</span>
                        ) : (
                          <span className="text-success font-sans">Paid in full</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        // Grid View
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No projects found</p>
            </div>
          ) : (
            filteredProjects.map((project) => (
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
                          {getStatusBadge(project.status)}
                          <Badge variant="outline" className="text-xs">{getTypeLabel(project.type)}</Badge>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Image className="h-3.5 w-3.5" />
                    <span>{project.deliverables.photos} photos</span>
                    {project.deliverables.videos > 0 && (
                      <>
                        <Video className="h-3.5 w-3.5" />
                        <span>{project.deliverables.videos} videos</span>
                      </>
                    )}
                    {project.deliverables.albums > 0 && (
                      <>
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>{project.deliverables.albums} albums</span>
                      </>
                    )}
                  </div>
                  <Progress value={project.progress} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-muted-foreground font-mono tabular-nums">
                      ${project.paidAmount.toLocaleString()} / ${project.totalValue.toLocaleString()}
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
            ))
          )}
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && confirmDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation */}
      <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmBulkDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
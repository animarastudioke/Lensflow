'use client'

import * as React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/currencies'
import {
  deleteClient,
  bulkDeleteClients,
  setClientsStatus,
} from '@/lib/actions/clients'
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
  Mail,
  Phone,
  Calendar,
  MapPin,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Users,
  Calendar as CalendarIcon,
  DollarSign,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  Images,
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
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { ViewToggle } from '@/components/layout/ViewToggle'
import { StatusBadge } from '@/components/layout/StatusBadge'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  status: 'lead' | 'active' | 'inactive' | 'archived'
  source?: string
  tags: string[]
  totalSpent: number
  totalOrders: number
  lastContact: string
  createdAt: string
  updatedAt: string
}

interface ClientListProps {
  studioSlug: string
  initialClients?: Client[]
  isLoading?: boolean
  currency?: string
  title?: string
  description?: string
  newHref?: string
  newLabel?: string
}

const VIEW_OPTIONS = [
  { value: 'table' as const, label: 'List', icon: LayoutList },
  { value: 'grid' as const, label: 'Grid', icon: LayoutGrid },
]

export function ClientList({
  studioSlug,
  initialClients,
  isLoading = false,
  currency = 'USD',
  title = 'Clients',
  description = 'Manage your client relationships',
  newHref,
  newLabel = 'Add Client',
}: ClientListProps) {
  const [clients, setClients] = React.useState<Client[]>(initialClients ?? [])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<string>('createdAt')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [selectedClients, setSelectedClients] = React.useState<string[]>([])
  const [isBulkPending, setIsBulkPending] = React.useState(false)

  // Filter and sort clients
  const filteredClients = React.useMemo(() => {
    let result = [...clients]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        c =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query) ||
          c.city?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof Client]
      const bVal = b[sortBy as keyof Client]
      if (aVal === undefined || bVal === undefined) return 0
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [clients, searchQuery, statusFilter, sortBy, sortOrder])

  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = React.useState(false)
  const hasFilters = searchQuery !== '' || statusFilter !== 'all'

  const handleDelete = (id: string) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = async (id: string) => {
    const result = await deleteClient(id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    setClients(prev => prev.filter(c => c.id !== id))
    setSelectedClients(prev => prev.filter(g => g !== id))
    toast.success('Client deleted')
  }

  const confirmBulkDelete = async () => {
    const result = await bulkDeleteClients(selectedClients, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    setClients(prev => prev.filter(c => !selectedClients.includes(c.id)))
    setSelectedClients([])
    toast.success('Clients deleted')
  }

  const exportToCsv = (rows: Client[]) => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'City', 'Total Spent']
    const lines = rows.map(c => [
      c.firstName, c.lastName, c.email, c.phone ?? '', c.status, c.city ?? '', String(c.totalSpent),
    ].map(field => `"${field.replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleBulkAction = async (action: 'delete' | 'archive' | 'export') => {
    if (selectedClients.length === 0) return

    switch (action) {
      case 'delete':
        setBulkDeleteConfirm(true)
        break
      case 'archive': {
        setIsBulkPending(true)
        const result = await setClientsStatus(selectedClients, 'archived', studioSlug)
        setIsBulkPending(false)
        if (result?.error) {
          toast.error(result.error)
          break
        }
        setClients(prev =>
          prev.map(c =>
            selectedClients.includes(c.id) ? { ...c, status: 'archived' as const } : c
          )
        )
        setSelectedClients([])
        toast.success('Clients archived')
        break
      }
      case 'export':
        exportToCsv(clients.filter(c => selectedClients.includes(c.id)))
        break
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedClients(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(filteredClients.map(c => c.id))
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
        title={title}
        description={description}
        actions={
          <Link href={newHref ?? `/dashboard/${studioSlug}/clients/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {newLabel}
            </Button>
          </Link>
        }
      />

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Newest First</SelectItem>
                  <SelectItem value="lastContact">Last Contact</SelectItem>
                  <SelectItem value="firstName">Name (A-Z)</SelectItem>
                  <SelectItem value="totalSpent">Total Spent</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}>
                {sortOrder === 'asc' ? <ArrowUpDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4 rotate-180" />}
              </Button>
              <ViewToggle value={viewMode} onValueChange={setViewMode} options={VIEW_OPTIONS} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedClients.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={isBulkPending} onClick={() => handleBulkAction('archive')}>
                  Archive
                </Button>
                <Button variant="outline" size="sm" disabled={isBulkPending} onClick={() => handleBulkAction('export')}>
                  Export
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

      {/* Client Table */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Users}
              title={clients.length === 0 ? 'No clients yet' : 'No clients match your filters'}
              description={
                clients.length === 0
                  ? 'Add your first client to start tracking relationships.'
                  : 'Try adjusting your search or filters.'
              }
              action={clients.length === 0 ? { label: newLabel, href: newHref ?? `/dashboard/${studioSlug}/clients/new` } : undefined}
              secondaryAction={hasFilters ? { label: 'Clear filters', onClick: () => { setSearchQuery(''); setStatusFilter('all') } } : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {viewMode === 'table' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                        onChange={toggleSelectAll}
                        aria-label="Select all clients"
                        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                      />
                    </TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Source</TableHead>
                    <TableHead className="text-right hidden xl:table-cell">Value</TableHead>
                    <TableHead className="w-48">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => toggleSelect(client.id)}
                          aria-label={`Select ${client.firstName} ${client.lastName}`}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src="" alt={client.firstName} />
                            <AvatarFallback className="text-sm">
                              {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{client.firstName} {client.lastName}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Last: {format(new Date(client.lastContact), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm text-muted-foreground">
                          {client.city}, {client.state}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <StatusBadge status={client.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className="text-xs">{client.source || '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-right hidden xl:table-cell font-mono tabular-nums">
                        {formatCurrency(client.totalSpent, currency)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${client.firstName} ${client.lastName}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/clients/${client.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/clients/${client.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/galleries/new?client=${client.id}`}>
                                <Images className="mr-2 h-4 w-4" />
                                Create Gallery
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/bookings/new?client=${client.id}`}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                Book Session
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/invoices/new?client=${client.id}`}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Create Invoice
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(client.id)}
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
            ) : (
              // Grid View
              <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredClients.map((client) => (
                  <Card key={client.id} className="card-hover">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedClients.includes(client.id)}
                            onChange={() => toggleSelect(client.id)}
                            aria-label={`Select ${client.firstName} ${client.lastName}`}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary mt-1"
                          />
                          <Avatar className="h-12 w-12">
                            <AvatarImage src="" alt={client.firstName} />
                            <AvatarFallback className="text-base">
                              {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg">{client.firstName} {client.lastName}</h3>
                            <StatusBadge status={client.status} />
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${client.firstName} ${client.lastName}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/clients/${client.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/clients/${client.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{client.city}, {client.state}</span>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                          <span className="font-mono tabular-nums text-foreground">{formatCurrency(client.totalSpent, currency)}</span> spent
                          <span className="mx-2">·</span>
                          {client.totalOrders} order{client.totalOrders !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/${studioSlug}/galleries/new?client=${client.id}`}>
                              <Images className="h-3.5 w-3.5 mr-1.5" />
                              Gallery
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/${studioSlug}/bookings/new?client=${client.id}`}>
                              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                              Book
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredClients.length} of {clients.length} clients
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete client"
        description="Are you sure you want to delete this client? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (deleteConfirm) await confirmDelete(deleteConfirm) }}
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        title={`Delete ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

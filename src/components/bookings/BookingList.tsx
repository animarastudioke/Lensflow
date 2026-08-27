'use client'

import * as React from 'react'
import Link from 'next/link'
import { format, addDays, startOfDay } from 'date-fns'
import { formatCurrency } from '@/lib/currencies'
import {
  Card,
  CardContent,
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
  Clock,
  MapPin,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  LayoutList,
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { ViewToggle } from '@/components/layout/ViewToggle'
import { StatusBadge } from '@/components/layout/StatusBadge'
import { toast } from 'sonner'
import { deleteBooking, updateBookingStatus, type BookingStatus as ServerBookingStatus } from '@/lib/actions/bookings'

interface Booking {
  id: string
  clientId: string
  clientName: string
  clientEmail: string
  clientAvatar?: string
  title: string
  type: 'wedding' | 'portrait' | 'engagement' | 'family' | 'corporate' | 'event' | 'other'
  status: ServerBookingStatus
  startDateTime: string
  endDateTime: string
  location: string
  address?: string
  packageId?: string
  packageName?: string
  totalPrice: number
  depositPaid: number
  balanceDue: number
  notes?: string
  createdAt: string
  updatedAt: string
}

function getTypeLabel(type: Booking['type']) {
  const typeLabels = {
    wedding: 'Wedding',
    portrait: 'Portrait',
    engagement: 'Engagement',
    family: 'Family',
    corporate: 'Corporate',
    event: 'Event',
    other: 'Other',
  }
  return typeLabels[type]
}

const VIEW_OPTIONS = [
  { value: 'table' as const, label: 'List', icon: LayoutList },
  { value: 'calendar' as const, label: 'Calendar', icon: Calendar },
]

interface BookingListProps {
  studioSlug: string
  initialBookings?: Booking[]
  isLoading?: boolean
  currency?: string
}

export function BookingList({ studioSlug, initialBookings, isLoading = false, currency = 'USD' }: BookingListProps) {
  const [bookings, setBookings] = React.useState<Booking[]>(initialBookings ?? [])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [dateFilter, setDateFilter] = React.useState<string>('all')
  const [sortBy] = React.useState<string>('startDateTime')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = React.useState<'table' | 'calendar'>('table')
  const [selectedBookings, setSelectedBookings] = React.useState<string[]>([])
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date())
  const [mutatingIds, setMutatingIds] = React.useState<string[]>([])
  const [isBulkPending, setIsBulkPending] = React.useState(false)

  // Filter and sort bookings
  const filteredBookings = React.useMemo(() => {
    let result = [...bookings]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        b =>
          b.title.toLowerCase().includes(query) ||
          b.clientName.toLowerCase().includes(query) ||
          b.clientEmail.toLowerCase().includes(query) ||
          b.location.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      result = result.filter(b => b.type === typeFilter)
    }

    // Date filter: today, this week, this month, upcoming, past
    if (dateFilter !== 'all') {
      const now = startOfDay(new Date())
      result = result.filter(b => {
        const bookingDate = startOfDay(new Date(b.startDateTime))
        const diffDays = Math.floor((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        switch (dateFilter) {
          case 'today':
            return diffDays === 0
          case 'week':
            return diffDays >= 0 && diffDays <= 7
          case 'month':
            return diffDays >= 0 && diffDays <= 30
          case 'upcoming':
            return diffDays > 0
          case 'past':
            return diffDays < 0
          default:
            return true
        }
      })
    }

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof Booking]
      const bVal = b[sortBy as keyof Booking]
      if (aVal === undefined || bVal === undefined) return 0
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [bookings, searchQuery, statusFilter, typeFilter, dateFilter, sortBy, sortOrder])

  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = React.useState(false)
  const hasFilters = searchQuery !== '' || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all'

  const handleDelete = (id: string) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = async (id: string) => {
    const result = await deleteBooking(id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    setBookings(prev => prev.filter(b => b.id !== id))
    setSelectedBookings(prev => prev.filter(g => g !== id))
  }

  const confirmBulkDelete = async () => {
    const ids = selectedBookings
    const results = await Promise.all(ids.map(async (id) => ({ id, result: await deleteBooking(id, studioSlug) })))
    const succeededIds = results.filter(r => !r.result?.error).map(r => r.id)
    const failedCount = results.length - succeededIds.length
    setBookings(prev => prev.filter(b => !succeededIds.includes(b.id)))
    setSelectedBookings(prev => prev.filter(id => !succeededIds.includes(id)))
    if (failedCount > 0) {
      toast.error(`${failedCount} booking${failedCount !== 1 ? 's' : ''} could not be deleted`)
      throw new Error('partial bulk delete failure')
    }
  }

  const setRowMutating = (id: string, mutating: boolean) => {
    setMutatingIds(prev => (mutating ? [...prev, id] : prev.filter(x => x !== id)))
  }

  const handleStatusChange = async (id: string, status: ServerBookingStatus) => {
    setRowMutating(id, true)
    const result = await updateBookingStatus(id, studioSlug, status)
    setRowMutating(id, false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setBookings(prev => prev.map(b => (b.id === id ? { ...b, status } : b)))
  }

  const handleBulkAction = async (action: 'delete' | 'confirm' | 'cancel') => {
    if (selectedBookings.length === 0) return

    if (action === 'delete') {
      setBulkDeleteConfirm(true)
      return
    }

    const status: ServerBookingStatus = action === 'confirm' ? 'confirmed' : 'cancelled'
    const ids = selectedBookings
    setIsBulkPending(true)
    const results = await Promise.all(ids.map(id => updateBookingStatus(id, studioSlug, status)))
    setIsBulkPending(false)
    if (results.some(r => 'error' in r)) {
      toast.error('Some bookings could not be updated')
    }
    setBookings(prev => prev.map(b => (ids.includes(b.id) ? { ...b, status } : b)))
    setSelectedBookings([])
  }

  const toggleSelect = (id: string) => {
    setSelectedBookings(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedBookings.length === filteredBookings.length) {
      setSelectedBookings([])
    } else {
      setSelectedBookings(filteredBookings.map(b => b.id))
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
        title="Bookings"
        description="Manage your sessions and appointments"
        actions={
          <Link href={`/dashboard/${studioSlug}/bookings/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
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
                  placeholder="Search bookings..."
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
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No show</SelectItem>
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
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
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
      {selectedBookings.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={isBulkPending} onClick={() => handleBulkAction('confirm')}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Confirm
                </Button>
                <Button variant="outline" size="sm" disabled={isBulkPending} onClick={() => handleBulkAction('cancel')}>
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
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

      {/* Booking Content */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            {filteredBookings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filters'}
                description={
                  bookings.length === 0
                    ? 'Schedule your first session to start tracking bookings.'
                    : 'Try adjusting your search or filters.'
                }
                action={bookings.length === 0 ? { label: 'New Booking', href: `/dashboard/${studioSlug}/bookings/new` } : undefined}
                secondaryAction={hasFilters ? { label: 'Clear filters', onClick: () => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all'); setDateFilter('all') } } : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
                        onChange={toggleSelectAll}
                        aria-label="Select all bookings"
                        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                      />
                    </TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Date & Time</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-right hidden xl:table-cell">Balance</TableHead>
                    <TableHead className="w-48">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const isMutating = mutatingIds.includes(booking.id)
                    return (
                      <TableRow key={booking.id} className="hover:bg-muted/50">
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedBookings.includes(booking.id)}
                            onChange={() => toggleSelect(booking.id)}
                            aria-label={`Select ${booking.title}`}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{booking.title}</p>
                          <p className="text-sm text-muted-foreground">{booking.packageName || 'Custom'}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={booking.clientAvatar ?? undefined} alt={booking.clientName} />
                              <AvatarFallback className="text-xs">
                                {booking.clientName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{booking.clientName}</p>
                              <p className="text-xs text-muted-foreground">{booking.clientEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{format(new Date(booking.startDateTime), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{format(new Date(booking.startDateTime), 'h:mm a')} - {format(new Date(booking.endDateTime), 'h:mm a')}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{booking.location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">{getTypeLabel(booking.type)}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <StatusBadge status={booking.status} />
                        </TableCell>
                        <TableCell className="text-right hidden xl:table-cell font-mono tabular-nums">
                          {booking.balanceDue > 0 ? (
                            <span className="text-destructive">{formatCurrency(booking.balanceDue, currency)} due</span>
                          ) : (
                            <span className="text-success font-sans">Paid in full</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isMutating} aria-label={`Actions for ${booking.title}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/${studioSlug}/bookings/${booking.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/${studioSlug}/bookings/${booking.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {booking.status !== 'confirmed' && booking.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'confirmed')}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                  Mark Confirmed
                                </DropdownMenuItem>
                              )}
                              {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'completed')}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              {booking.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'cancelled')} className="text-destructive focus:text-destructive">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(booking.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        // Calendar View
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {format(selectedDate ?? new Date(), 'MMMM yyyy')}
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => d ? addDays(d, -1) : undefined)} aria-label="Previous day">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => d ? addDays(d, 1) : undefined)} aria-label="Next day">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => setSelectedDate(date as Date)}
              className="p-4"
            />
            <div className="p-4 border-t">
              <h4 className="font-medium mb-3">Bookings on {format(selectedDate ?? new Date(), 'EEEE, MMMM d, yyyy')}</h4>
              {filteredBookings
                .filter(b => format(new Date(b.startDateTime), 'yyyy-MM-dd') === format(selectedDate ?? new Date(), 'yyyy-MM-dd'))
                .map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium">{booking.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.startDateTime), 'h:mm a')} - {booking.clientName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={booking.status} />
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8" aria-label={`View ${booking.title}`}>
                        <Link href={`/dashboard/${studioSlug}/bookings/${booking.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              {filteredBookings
                .filter(b => format(new Date(b.startDateTime), 'yyyy-MM-dd') !== format(selectedDate ?? new Date(), 'yyyy-MM-dd'))
                .length === filteredBookings.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">No bookings on this day</p>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete booking"
        description="Are you sure you want to delete this booking? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (deleteConfirm) await confirmDelete(deleteConfirm) }}
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        title={`Delete ${selectedBookings.length} booking${selectedBookings.length !== 1 ? 's' : ''}`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

'use client'

import * as React from 'react'
import Link from 'next/link'
import { format, addDays, startOfDay } from 'date-fns'
import { formatCurrency } from '@/lib/currencies'
import {
  Card,
  CardContent,
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

interface Booking {
  id: string
  clientId: string
  clientName: string
  clientEmail: string
  clientAvatar?: string
  title: string
  type: 'wedding' | 'portrait' | 'engagement' | 'family' | 'corporate' | 'event' | 'other'
  status: 'inquiry' | 'confirmed' | 'scheduled' | 'completed' | 'cancelled' | 'no-show'
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

const mockBookings: Booking[] = [
  {
    id: '1',
    clientId: '1',
    clientName: 'Sarah Chen',
    clientEmail: 'sarah.chen@email.com',
    title: 'Chen Wedding',
    type: 'wedding',
    status: 'confirmed',
    startDateTime: '2024-06-15T14:00:00Z',
    endDateTime: '2024-06-15T22:00:00Z',
    location: 'Golden Gate Park',
    address: 'Golden Gate Park, San Francisco, CA 94118',
    packageName: 'Wedding Premium',
    totalPrice: 4500,
    depositPaid: 1500,
    balanceDue: 3000,
    notes: 'First look at 12pm. Ceremony at 3pm. Reception at 6pm.',
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2024-01-10T14:30:00Z',
  },
  {
    id: '2',
    clientId: '2',
    clientName: 'Marcus Johnson',
    clientEmail: 'marcus.j@email.com',
    title: 'Johnson Family Portraits',
    type: 'family',
    status: 'scheduled',
    startDateTime: '2024-02-10T10:00:00Z',
    endDateTime: '2024-02-10T12:00:00Z',
    location: 'Studio',
    address: '123 Studio St, Los Angeles, CA 90210',
    packageName: 'Family Session',
    totalPrice: 800,
    depositPaid: 200,
    balanceDue: 600,
    notes: 'Outdoor session preferred. 2 adults, 2 kids (ages 4 and 7).',
    createdAt: '2024-01-05T15:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
  },
  {
    id: '3',
    clientId: '3',
    clientName: 'Emily Rodriguez',
    clientEmail: 'emily.r@email.com',
    title: 'Engagement Session',
    type: 'engagement',
    status: 'inquiry',
    startDateTime: '2024-03-20T16:00:00Z',
    endDateTime: '2024-03-20T18:00:00Z',
    location: 'Mount Tamalpais',
    packageName: 'Engagement Session',
    totalPrice: 600,
    depositPaid: 0,
    balanceDue: 600,
    notes: 'Wants sunset shots. Dog may join for some photos.',
    createdAt: '2024-01-12T11:00:00Z',
    updatedAt: '2024-01-12T11:00:00Z',
  },
  {
    id: '4',
    clientId: '4',
    clientName: 'David Park',
    clientEmail: 'david.park@email.com',
    title: 'Corporate Headshots',
    type: 'corporate',
    status: 'completed',
    startDateTime: '2024-01-08T09:00:00Z',
    endDateTime: '2024-01-08T12:00:00Z',
    location: 'Client Office',
    address: '100 Business Ave, Seattle, WA 98101',
    packageName: 'Corporate Package',
    totalPrice: 1200,
    depositPaid: 1200,
    balanceDue: 0,
    notes: '15 employees. White backdrop. Delivered 48 hours.',
    createdAt: '2023-11-20T10:00:00Z',
    updatedAt: '2024-01-08T13:00:00Z',
  },
]

function getStatusBadge(status: Booking['status']) {
  const statusConfig = {
    inquiry: { label: 'Inquiry', variant: 'info' as const },
    confirmed: { label: 'Confirmed', variant: 'success' as const },
    scheduled: { label: 'Scheduled', variant: 'default' as const },
    completed: { label: 'Completed', variant: 'secondary' as const },
    cancelled: { label: 'Cancelled', variant: 'destructive' as const },
    'no-show': { label: 'No Show', variant: 'warning' as const },
  }
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
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

interface BookingListProps {
  studioSlug: string
  initialBookings?: Booking[]
  isLoading?: boolean
  currency?: string
}

export function BookingList({ studioSlug, initialBookings, isLoading = false, currency = 'USD' }: BookingListProps) {
  const [bookings, setBookings] = React.useState<Booking[]>(initialBookings ?? mockBookings)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [dateFilter, setDateFilter] = React.useState<string>('all')
  const [sortBy] = React.useState<string>('startDateTime')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = React.useState<'table' | 'calendar'>('table')
  const [selectedBookings, setSelectedBookings] = React.useState<string[]>([])
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date())

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

  const handleDelete = (id: string) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id))
    setSelectedBookings(prev => prev.filter(g => g !== id))
    setDeleteConfirm(null)
  }

  const confirmBulkDelete = () => {
    setBookings(prev => prev.filter(b => !selectedBookings.includes(b.id)))
    setSelectedBookings([])
    setBulkDeleteConfirm(false)
  }

  const handleBulkAction = (action: 'delete' | 'confirm' | 'cancel') => {
    if (selectedBookings.length === 0) return

    switch (action) {
      case 'delete':
        setBulkDeleteConfirm(true)
        break
      case 'confirm':
        setBookings(prev =>
          prev.map(b =>
            selectedBookings.includes(b.id) ? { ...b, status: 'confirmed' as const } : b
          )
        )
        setSelectedBookings([])
        break
      case 'cancel':
        setBookings(prev =>
          prev.map(b =>
            selectedBookings.includes(b.id) ? { ...b, status: 'cancelled' as const } : b
          )
        )
        setSelectedBookings([])
        break
    }
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display font-semibold text-foreground">Bookings</h1>
          <p className="text-body text-muted-foreground mt-1">Manage your sessions and appointments</p>
        </div>
        <Link href={`/dashboard/${studioSlug}/bookings/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
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
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </Button>
            </div>

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
                  <SelectItem value="no-show">No Show</SelectItem>
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
              <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
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
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('confirm')}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Confirm
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('cancel')}>
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
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

      {/* Booking Content */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
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
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No bookings found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => (
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
                        {getStatusBadge(booking.status)}
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
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                              <DropdownMenuItem onClick={() => {
                                setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'confirmed' as const } : b))
                              }}>
                                <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                Mark Confirmed
                              </DropdownMenuItem>
                            )}
                            {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                              <DropdownMenuItem onClick={() => {
                                setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' as const } : b))
                              }}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            {booking.status !== 'cancelled' && (
                              <DropdownMenuItem onClick={() => {
                                setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' as const } : b))
                              }} className="text-destructive focus:text-destructive">
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
                  ))
                )}
              </TableBody>
            </Table>
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
                  <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => d ? addDays(d, -1) : undefined)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => d ? addDays(d, 1) : undefined)}>
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
                      {getStatusBadge(booking.status)}
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
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
            <DialogTitle>Delete {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}</DialogTitle>
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
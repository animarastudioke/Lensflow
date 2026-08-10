'use client'

import * as React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
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
  FileText,
  DollarSign,
  Eye,
  MoreVertical,
  Trash2,
  Edit,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  Calendar,
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

export interface Quote {
  id: string
  quoteNumber: string
  title: string
  clientId: string
  clientName: string
  clientEmail: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'
  issueDate: string
  expiresAt?: string
  items: {
    description: string
    quantity: number
    unitPrice: number
    total: number
  }[]
  subtotal: number
  tax: number
  discount: number
  total: number
  notes?: string
  createdAt: string
  updatedAt: string
}

function getStatusBadge(status: Quote['status']) {
  const statusConfig = {
    draft: { label: 'Draft', variant: 'secondary' as const },
    sent: { label: 'Sent', variant: 'info' as const },
    viewed: { label: 'Viewed', variant: 'outline' as const },
    accepted: { label: 'Accepted', variant: 'success' as const },
    declined: { label: 'Declined', variant: 'destructive' as const },
    expired: { label: 'Expired', variant: 'secondary' as const },
  }
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface QuoteListProps {
  studioSlug: string
  initialQuotes?: Quote[]
  isLoading?: boolean
}

export function QuoteList({ studioSlug, initialQuotes, isLoading = false }: QuoteListProps) {
  const [quotes, setQuotes] = React.useState<Quote[]>(initialQuotes ?? [])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [selectedQuotes, setSelectedQuotes] = React.useState<string[]>([])

  const filteredQuotes = React.useMemo(() => {
    let result = [...quotes]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        q =>
          q.quoteNumber.toLowerCase().includes(query) ||
          q.title.toLowerCase().includes(query) ||
          q.clientName.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(q => q.status === statusFilter)
    }

    result.sort((a, b) => {
      const comparison = a.issueDate.localeCompare(b.issueDate)
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [quotes, searchQuery, statusFilter, sortOrder])

  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)

  const confirmDelete = (id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id))
    setSelectedQuotes(prev => prev.filter(g => g !== id))
    setDeleteConfirm(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedQuotes(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedQuotes.length === filteredQuotes.length) {
      setSelectedQuotes([])
    } else {
      setSelectedQuotes(filteredQuotes.map(q => q.id))
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

  const pendingValue = quotes.filter(q => q.status === 'sent' || q.status === 'viewed').reduce((sum, q) => sum + q.total, 0)
  const acceptedValue = quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.total, 0)
  const acceptedCount = quotes.filter(q => q.status === 'accepted').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Pending value</span>
            <Clock className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            ${pendingValue.toLocaleString()}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Accepted value</span>
            <DollarSign className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-success tabular-nums">
            ${acceptedValue.toLocaleString()}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Accepted quotes</span>
            <CheckCircle className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {acceptedCount}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display font-semibold text-foreground">Quotes</h1>
          <p className="text-body text-muted-foreground mt-1">Send estimates and track client approvals</p>
        </div>
        <Link href={`/dashboard/${studioSlug}/quotes/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Quote
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1" />
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search quotes..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? <ArrowUpDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4 rotate-180" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedQuotes.length === filteredQuotes.length && filteredQuotes.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all quotes"
                    className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                  />
                </TableHead>
                <TableHead>Quote #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Dates</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Amount</TableHead>
                <TableHead className="w-48">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No quotes found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotes.map((quote) => (
                  <TableRow key={quote.id} className="hover:bg-muted/50">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedQuotes.includes(quote.id)}
                        onChange={() => toggleSelect(quote.id)}
                        aria-label={`Select ${quote.quoteNumber}`}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium font-mono">{quote.quoteNumber}</p>
                      <p className="text-xs text-muted-foreground">{quote.title}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" alt={quote.clientName} />
                          <AvatarFallback className="text-xs">
                            {quote.clientName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{quote.clientName}</p>
                          <p className="text-xs text-muted-foreground">{quote.clientEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Issued: {format(new Date(quote.issueDate), 'MMM d, yyyy')}</span>
                        </div>
                        {quote.expiresAt && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Expires: {format(new Date(quote.expiresAt), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {getStatusBadge(quote.status)}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell font-mono tabular-nums">
                      ${quote.total.toLocaleString()}
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
                            <Link href={`/dashboard/${studioSlug}/quotes/${quote.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/${studioSlug}/quotes/${quote.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {quote.status === 'draft' && (
                            <DropdownMenuItem onClick={() => {
                              setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'sent' as const } : q))
                            }}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Quote
                            </DropdownMenuItem>
                          )}
                          {(quote.status === 'sent' || quote.status === 'viewed') && (
                            <>
                              <DropdownMenuItem onClick={() => {
                                setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'accepted' as const } : q))
                              }}>
                                <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                Mark Accepted
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'declined' as const } : q))
                              }}>
                                <XCircle className="mr-2 h-4 w-4 text-destructive" />
                                Mark Declined
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirm(quote.id)}
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredQuotes.length} of {quotes.length} quotes
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && confirmDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
  FileText,
  DollarSign,
  Eye,
  MoreVertical,
  Trash2,
  Edit,
  Download,
  Mail,
  AlertCircle,
  Clock,
  Banknote,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  CheckCircle,
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

interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  clientName: string
  clientEmail: string
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded'
  issueDate: string
  dueDate: string
  paidDate?: string
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
  amountPaid: number
  balanceDue: number
  paymentMethod?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-001',
    clientId: '1',
    clientName: 'Sarah Chen',
    clientEmail: 'sarah.chen@email.com',
    status: 'paid',
    issueDate: '2024-01-15',
    dueDate: '2024-02-14',
    paidDate: '2024-01-20',
    items: [
      { description: 'Wedding Photography - 8hr coverage', quantity: 1, unitPrice: 3500, total: 3500 },
      { description: 'Highlight Video (3-5 min)', quantity: 1, unitPrice: 500, total: 500 },
      { description: 'Premium Album (10x10, 30 pages)', quantity: 1, unitPrice: 500, total: 500 },
    ],
    subtotal: 4500,
    tax: 0,
    discount: 0,
    total: 4500,
    amountPaid: 4500,
    balanceDue: 0,
    paymentMethod: 'Credit Card',
    notes: 'Thank you for your business!',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
  {
    id: '2',
    invoiceNumber: 'INV-002',
    clientId: '2',
    clientName: 'Marcus Johnson',
    clientEmail: 'marcus.j@email.com',
    status: 'sent',
    issueDate: '2024-01-10',
    dueDate: '2024-02-09',
    items: [
      { description: 'Family Portrait Session - 2hr', quantity: 1, unitPrice: 600, total: 600 },
      { description: '8x10 Premium Album', quantity: 1, unitPrice: 200, total: 200 },
    ],
    subtotal: 800,
    tax: 0,
    discount: 0,
    total: 800,
    amountPaid: 200,
    balanceDue: 600,
    notes: 'Deposit paid at booking. Balance due before delivery.',
    createdAt: '2024-01-10T15:00:00Z',
    updatedAt: '2024-01-10T15:00:00Z',
  },
  {
    id: '3',
    invoiceNumber: 'INV-003',
    clientId: '3',
    clientName: 'Emily Rodriguez',
    clientEmail: 'emily.r@email.com',
    status: 'overdue',
    issueDate: '2023-12-20',
    dueDate: '2024-01-19',
    items: [
      { description: 'Engagement Session - 2hr', quantity: 1, unitPrice: 500, total: 500 },
      { description: 'Digital Gallery (1 year hosting)', quantity: 1, unitPrice: 100, total: 100 },
    ],
    subtotal: 600,
    tax: 0,
    discount: 0,
    total: 600,
    amountPaid: 0,
    balanceDue: 600,
    notes: 'Payment overdue. Please follow up.',
    createdAt: '2023-12-20T11:00:00Z',
    updatedAt: '2024-01-20T09:00:00Z',
  },
  {
    id: '4',
    invoiceNumber: 'INV-004',
    clientId: '4',
    clientName: 'David Park',
    clientEmail: 'david.park@email.com',
    status: 'paid',
    issueDate: '2024-01-05',
    dueDate: '2024-02-04',
    paidDate: '2024-01-08',
    items: [
      { description: 'Corporate Headshots - 15 employees', quantity: 1, unitPrice: 1200, total: 1200 },
    ],
    subtotal: 1200,
    tax: 0,
    discount: 0,
    total: 1200,
    amountPaid: 1200,
    balanceDue: 0,
    paymentMethod: 'Bank Transfer',
    notes: 'Net 30 terms.',
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-08T13:00:00Z',
  },
]

function getStatusBadge(status: Invoice['status']) {
  const statusConfig = {
    draft: { label: 'Draft', variant: 'secondary' as const },
    sent: { label: 'Sent', variant: 'info' as const },
    viewed: { label: 'Viewed', variant: 'outline' as const },
    paid: { label: 'Paid', variant: 'success' as const },
    partial: { label: 'Partial', variant: 'warning' as const },
    overdue: { label: 'Overdue', variant: 'destructive' as const },
    cancelled: { label: 'Cancelled', variant: 'secondary' as const },
    refunded: { label: 'Refunded', variant: 'outline' as const },
  }
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface InvoiceListProps {
  studioSlug: string
  initialInvoices?: Invoice[]
  isLoading?: boolean
}

export function InvoiceList({ studioSlug, initialInvoices, isLoading = false }: InvoiceListProps) {
  const [invoices, setInvoices] = React.useState<Invoice[]>(initialInvoices ?? mockInvoices)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [sortBy] = React.useState<string>('issueDate')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [selectedInvoices, setSelectedInvoices] = React.useState<string[]>([])

  // Filter and sort invoices
  const filteredInvoices = React.useMemo(() => {
    let result = [...invoices]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        i =>
          i.invoiceNumber.toLowerCase().includes(query) ||
          i.clientName.toLowerCase().includes(query) ||
          i.clientEmail.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter)
    }

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof Invoice]
      const bVal = b[sortBy as keyof Invoice]
      if (aVal === undefined || bVal === undefined) return 0
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [invoices, searchQuery, statusFilter, sortBy, sortOrder])

  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = React.useState(false)

  const handleDelete = (id: string) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id))
    setSelectedInvoices(prev => prev.filter(g => g !== id))
    setDeleteConfirm(null)
  }

  const confirmBulkDelete = () => {
    setInvoices(prev => prev.filter(i => !selectedInvoices.includes(i.id)))
    setSelectedInvoices([])
    setBulkDeleteConfirm(false)
  }

  const handleBulkAction = (action: 'delete' | 'send' | 'mark-paid') => {
    if (selectedInvoices.length === 0) return

    switch (action) {
      case 'delete':
        setBulkDeleteConfirm(true)
        break
      case 'send':
        setInvoices(prev =>
          prev.map(i =>
            selectedInvoices.includes(i.id) && i.status === 'draft'
              ? { ...i, status: 'sent' as const }
              : i
          )
        )
        setSelectedInvoices([])
        break
      case 'mark-paid':
        setInvoices(prev =>
          prev.map(i =>
            selectedInvoices.includes(i.id)
              ? { ...i, status: 'paid' as const, amountPaid: i.total, balanceDue: 0, paidDate: new Date().toISOString() }
              : i
          )
        )
        setSelectedInvoices([])
        break
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedInvoices(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(filteredInvoices.map(i => i.id))
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

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0)
  const outstandingAmount = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'refunded').reduce((sum, i) => sum + i.balanceDue, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  return (
    <div className="space-y-6">
      {/* Stats plaque: one bordered region, hairline dividers, not repeated cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Total revenue</span>
            <DollarSign className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            ${totalRevenue.toLocaleString()}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Outstanding</span>
            <Clock className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-destructive tabular-nums">
            ${outstandingAmount.toLocaleString()}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Overdue</span>
            <AlertCircle className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-destructive tabular-nums">
            {overdueCount}
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display font-semibold text-foreground">Invoices</h1>
          <p className="text-body text-muted-foreground mt-1">Track payments, send reminders, manage billing</p>
        </div>
        <Link href={`/dashboard/${studioSlug}/invoices/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
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
                  placeholder="Search invoices..."
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
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
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
      {selectedInvoices.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('send')}>
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Send
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('mark-paid')}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Mark Paid
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

      {/* Invoice Content */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select all invoices"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Dates</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Amount</TableHead>
                  <TableHead className="text-right hidden xl:table-cell">Balance</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No invoices found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={() => toggleSelect(invoice.id)}
                          aria-label={`Select ${invoice.invoiceNumber}`}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium font-mono">{invoice.invoiceNumber}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="" alt={invoice.clientName} />
                            <AvatarFallback className="text-xs">
                              {invoice.clientName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{invoice.clientName}</p>
                            <p className="text-xs text-muted-foreground">{invoice.clientEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Issued: {format(new Date(invoice.issueDate), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span className={invoice.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground'}>
                              Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {invoice.paidDate && (
                            <div className="flex items-center gap-1 text-success">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Paid: {format(new Date(invoice.paidDate), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell font-mono tabular-nums">
                        ${invoice.total.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right hidden xl:table-cell font-mono tabular-nums">
                        {invoice.balanceDue > 0 ? (
                          <span className="text-destructive">${invoice.balanceDue.toLocaleString()}</span>
                        ) : (
                          <span className="text-success">$0</span>
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
                              <Link href={`/dashboard/${studioSlug}/invoices/${invoice.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/invoices/${invoice.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/invoices/${invoice.id}/preview`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}}>
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'sent' as const } : i))
                                }}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send Invoice
                                </DropdownMenuItem>
                              </>
                            )}
                            {(invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'partial' || invoice.status === 'overdue') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'paid' as const, amountPaid: i.total, balanceDue: 0, paidDate: new Date().toISOString() } : i))
                                }}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                  Mark as Paid
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {}}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send Reminder
                                </DropdownMenuItem>
                              </>
                            )}
                            {invoice.status === 'paid' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {}}>
                                  <Banknote className="mr-2 h-4 w-4" />
                                  Record Refund
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(invoice.id)}
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
          {filteredInvoices.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          ) : (
            filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="card-hover">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => toggleSelect(invoice.id)}
                        aria-label={`Select ${invoice.invoiceNumber}`}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                      />
                      <div className="min-w-0">
                        <h3 className="font-medium truncate font-mono">{invoice.invoiceNumber}</h3>
                        <p className="text-sm text-muted-foreground">{invoice.clientName}</p>
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
                          <Link href={`/dashboard/${studioSlug}/invoices/${invoice.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(invoice.id)}
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
                  <div className="flex items-center justify-between">
                    {getStatusBadge(invoice.status)}
                    <span className="text-sm text-muted-foreground">
                      Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-medium tabular-nums">${invoice.total.toLocaleString()}</div>
                  {invoice.balanceDue > 0 && (
                    <div className="text-sm text-destructive">
                      Balance due: <span className="font-mono tabular-nums">${invoice.balanceDue.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/${studioSlug}/invoices/${invoice.id}`}>
                          View
                        </Link>
                      </Button>
                      {(invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'partial' || invoice.status === 'overdue') && (
                        <Button variant="default" size="sm" onClick={() => {
                          setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'paid' as const, amountPaid: i.total, balanceDue: 0, paidDate: new Date().toISOString() } : i))
                        }}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Mark Paid
                        </Button>
                      )}
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
          Showing {filteredInvoices.length} of {invoices.length} invoices
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
            <DialogTitle>Delete invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
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
            <DialogTitle>Delete {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''}</DialogTitle>
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

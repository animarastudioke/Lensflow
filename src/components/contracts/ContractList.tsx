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
  Eye,
  MoreVertical,
  Trash2,
  Edit,
  Download,
  CheckCircle,
  Clock,
  Mail,
  XCircle,
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
import { deleteContract, updateContractStatus, type ContractRow } from '@/lib/actions/contracts'

interface Contract {
  id: string
  clientId: string
  clientName: string
  clientEmail: string
  title: string
  type: 'wedding' | 'portrait' | 'engagement' | 'family' | 'corporate' | 'event' | 'model-release' | 'license' | 'other'
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'completed' | 'expired' | 'declined' | 'cancelled'
  sentAt?: string
  viewedAt?: string
  signedAt?: string
  expiresAt?: string
  totalValue: number
  depositRequired: number
  depositPaid: number
  signers: {
    name: string
    email: string
    status: 'pending' | 'signed' | 'declined'
    signedAt?: string
  }[]
  templateId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

const CONTRACT_TYPES = ['wedding', 'portrait', 'engagement', 'family', 'corporate', 'event', 'model-release', 'license', 'other'] as const

function toContractType(type: string): Contract['type'] {
  return (CONTRACT_TYPES as readonly string[]).includes(type) ? (type as Contract['type']) : 'other'
}

function mapContractRow(row: ContractRow): Contract {
  return {
    id: row.id,
    clientId: row.client_id ?? '',
    clientName: row.client?.name ?? 'No client',
    clientEmail: row.client?.email ?? '',
    title: row.title,
    type: toContractType(row.type),
    status: row.status,
    sentAt: row.sent_at ?? undefined,
    viewedAt: row.viewed_at ?? undefined,
    signedAt: row.signed_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    totalValue: row.total_value,
    depositRequired: row.deposit_required,
    depositPaid: row.deposit_paid,
    signers: row.signers.map((s) => ({
      name: s.name,
      email: s.email,
      status: s.status,
      signedAt: s.signed_at ?? undefined,
    })),
    templateId: row.template_id ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getStatusBadge(status: Contract['status']) {
  const statusConfig = {
    draft: { label: 'Draft', variant: 'secondary' as const },
    sent: { label: 'Sent', variant: 'info' as const },
    viewed: { label: 'Viewed', variant: 'outline' as const },
    signed: { label: 'Signed', variant: 'default' as const },
    completed: { label: 'Completed', variant: 'success' as const },
    expired: { label: 'Expired', variant: 'destructive' as const },
    declined: { label: 'Declined', variant: 'destructive' as const },
    cancelled: { label: 'Cancelled', variant: 'secondary' as const },
  }
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function getTypeLabel(type: Contract['type']) {
  const typeLabels = {
    wedding: 'Wedding',
    portrait: 'Portrait',
    engagement: 'Engagement',
    family: 'Family',
    corporate: 'Corporate',
    event: 'Event',
    'model-release': 'Model Release',
    license: 'License',
    other: 'Other',
  }
  return typeLabels[type]
}

function getSignerStatus(signers: Contract['signers']) {
  const signed = signers.filter(s => s.status === 'signed').length
  const total = signers.length
  return `${signed}/${total} signed`
}

interface ContractListProps {
  studioSlug: string
  initialContracts: ContractRow[]
  isLoading?: boolean
  currency?: string
}

export function ContractList({ studioSlug, initialContracts, isLoading = false, currency = 'USD' }: ContractListProps) {

  const [contracts, setContracts] = React.useState<Contract[]>(() => initialContracts.map(mapContractRow))
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [sortBy] = React.useState<string>('createdAt')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [selectedContracts, setSelectedContracts] = React.useState<string[]>([])

  // Filter and sort contracts
  const filteredContracts = React.useMemo(() => {
    let result = [...contracts]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        c =>
          c.title.toLowerCase().includes(query) ||
          c.clientName.toLowerCase().includes(query) ||
          c.clientEmail.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      result = result.filter(c => c.type === typeFilter)
    }

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof Contract]
      const bVal = b[sortBy as keyof Contract]
      if (aVal === undefined || bVal === undefined) return 0
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [contracts, searchQuery, statusFilter, typeFilter, sortBy, sortOrder])

  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = React.useState(false)

  const handleDelete = (id: string) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = async (id: string) => {
    const result = await deleteContract(id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setContracts(prev => prev.filter(c => c.id !== id))
    setSelectedContracts(prev => prev.filter(g => g !== id))
    setDeleteConfirm(null)
  }

  const confirmBulkDelete = async () => {
    const ids = selectedContracts
    const results = await Promise.all(ids.map(id => deleteContract(id, studioSlug)))
    if (results.some(r => r?.error)) {
      toast.error('Some contracts could not be deleted')
    }
    setContracts(prev => prev.filter(c => !ids.includes(c.id)))
    setSelectedContracts([])
    setBulkDeleteConfirm(false)
  }

  const handleContractStatusChange = async (id: string, status: Contract['status']) => {
    const result = await updateContractStatus(id, studioSlug, status)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setContracts(prev =>
      prev.map(c => c.id === id
        ? { ...c, status, sentAt: status === 'sent' ? new Date().toISOString() : c.sentAt }
        : c
      )
    )
  }

  const handleBulkAction = async (action: 'delete' | 'cancel') => {
    if (selectedContracts.length === 0) return

    if (action === 'delete') {
      setBulkDeleteConfirm(true)
      return
    }

    const ids = selectedContracts
    const results = await Promise.all(ids.map(id => updateContractStatus(id, studioSlug, 'cancelled')))
    if (results.some(r => r?.error)) {
      toast.error('Some contracts could not be cancelled')
    }
    setContracts(prev => prev.map(c => ids.includes(c.id) ? { ...c, status: 'cancelled' as const } : c))
    setSelectedContracts([])
  }

  const toggleSelect = (id: string) => {
    setSelectedContracts(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedContracts.length === filteredContracts.length) {
      setSelectedContracts([])
    } else {
      setSelectedContracts(filteredContracts.map(c => c.id))
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
          <h1 className="text-display-md font-display font-semibold text-foreground">Contracts</h1>
          <p className="text-body text-muted-foreground mt-1">Manage agreements, signatures, and documents</p>
        </div>
        <Link href={`/dashboard/${studioSlug}/contracts/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Contract
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
                  placeholder="Search contracts..."
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
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  <SelectItem value="model-release">Model Release</SelectItem>
                  <SelectItem value="license">License</SelectItem>
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
      {selectedContracts.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedContracts.length} contract{selectedContracts.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
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

      {/* Contract Content */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedContracts.length === filteredContracts.length && filteredContracts.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select all contracts"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Dates</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Signatures</TableHead>
                  <TableHead className="text-right hidden xl:table-cell">Value</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No contracts found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContracts.map((contract) => (
                    <TableRow key={contract.id} className="hover:bg-muted/50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedContracts.includes(contract.id)}
                          onChange={() => toggleSelect(contract.id)}
                          aria-label={`Select ${contract.title}`}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{contract.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {contract.templateId ? `Template: ${contract.templateId}` : 'Custom contract'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="" alt={contract.clientName} />
                            <AvatarFallback className="text-xs">
                              {contract.clientName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{contract.clientName}</p>
                            <p className="text-xs text-muted-foreground">{contract.clientEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1 text-sm">
                          {contract.sentAt && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              <span>Sent: {format(new Date(contract.sentAt), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                          {contract.signedAt && (
                            <div className="flex items-center gap-1 text-success">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Signed: {format(new Date(contract.signedAt), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                          {contract.expiresAt && (
                            <div className="flex items-center gap-1 text-destructive">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Expires: {format(new Date(contract.expiresAt), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{getTypeLabel(contract.type)}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {getStatusBadge(contract.status)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{getSignerStatus(contract.signers)}</span>
                          {contract.status === 'sent' || contract.status === 'viewed' ? (
                            <span className="h-2 w-2 rounded-full bg-warning animate-pulse" title="Pending" />
                          ) : contract.status === 'signed' || contract.status === 'completed' ? (
                            <span className="h-2 w-2 rounded-full bg-success" title="All signed" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" title="Not sent" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden xl:table-cell font-mono tabular-nums text-sm font-medium">
                        {contract.depositPaid < contract.depositRequired ? (
                          <span className="text-destructive">{formatCurrency(contract.depositRequired - contract.depositPaid, currency)} deposit due</span>
                        ) : (
                          <span className="text-success font-sans">Deposit paid</span>
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
                              <Link href={`/dashboard/${studioSlug}/contracts/${contract.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/contracts/${contract.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/contracts/${contract.id}/preview`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} >
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </DropdownMenuItem>
                            {contract.status === 'draft' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleContractStatusChange(contract.id, 'sent')}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send for Signature
                                </DropdownMenuItem>
                              </>
                            )}
                            {contract.status === 'sent' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleContractStatusChange(contract.id, 'cancelled')} className="text-destructive">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(contract.id)}
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
          {filteredContracts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No contracts found</p>
            </div>
          ) : (
            filteredContracts.map((contract) => (
              <Card key={contract.id} className="card-hover">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedContracts.includes(contract.id)}
                        onChange={() => toggleSelect(contract.id)}
                        aria-label={`Select ${contract.title}`}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary mt-1"
                      />
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{contract.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(contract.status)}
                          <Badge variant="outline" className="text-xs">{getTypeLabel(contract.type)}</Badge>
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
                          <Link href={`/dashboard/${studioSlug}/contracts/${contract.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/${studioSlug}/contracts/${contract.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(contract.id)}
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
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {contract.clientName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span>{contract.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{getSignerStatus(contract.signers)}</span>
                    {contract.status === 'sent' || contract.status === 'viewed' ? (
                      <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                    ) : contract.status === 'signed' || contract.status === 'completed' ? (
                      <span className="h-2 w-2 rounded-full bg-success" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                  {contract.expiresAt && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Expires: {format(new Date(contract.expiresAt), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">
                      <span className="font-mono tabular-nums text-foreground">{formatCurrency(contract.depositPaid, currency)}</span> / <span className="font-mono tabular-nums">{formatCurrency(contract.depositRequired, currency)}</span> deposit
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/${studioSlug}/contracts/${contract.id}`}>
                          View
                        </Link>
                      </Button>
                      {contract.status === 'draft' && (
                        <Button variant="default" size="sm" onClick={() => handleContractStatusChange(contract.id, 'sent')}>
                          <Mail className="h-3.5 w-3.5 mr-1.5" />
                          Send
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
          Showing {filteredContracts.length} of {contracts.length} contracts
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
            <DialogTitle>Delete contract</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contract? This action cannot be undone.
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
            <DialogTitle>Delete {selectedContracts.length} contract{selectedContracts.length !== 1 ? 's' : ''}</DialogTitle>
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
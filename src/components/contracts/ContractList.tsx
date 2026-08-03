'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Filter,
  FileText,
  PenTool,
  Eye,
  MoreVertical,
  Trash2,
  Edit,
  Download,
  AlertCircle,
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
import { Separator } from '@/components/ui/separator'

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

const mockContracts: Contract[] = [
  {
    id: '1',
    clientId: '1',
    clientName: 'Sarah Chen',
    clientEmail: 'sarah.chen@email.com',
    title: 'Chen Wedding Photography Contract',
    type: 'wedding',
    status: 'signed',
    sentAt: '2023-12-15T10:00:00Z',
    viewedAt: '2023-12-15T14:30:00Z',
    signedAt: '2023-12-16T09:15:00Z',
    expiresAt: '2024-06-15T23:59:59Z',
    totalValue: 4500,
    depositRequired: 1500,
    depositPaid: 1500,
    signers: [
      { name: 'Sarah Chen', email: 'sarah.chen@email.com', status: 'signed', signedAt: '2023-12-16T09:15:00Z' },
      { name: 'Michael Chen', email: 'michael.chen@email.com', status: 'signed', signedAt: '2023-12-16T09:20:00Z' },
    ],
    templateId: 'wedding-premium',
    notes: '8hr coverage, 850+ photos, highlight video, album',
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2023-12-16T09:20:00Z',
  },
  {
    id: '2',
    clientId: '2',
    clientName: 'Marcus Johnson',
    clientEmail: 'marcus.j@email.com',
    title: 'Johnson Family Portrait Agreement',
    type: 'portrait',
    status: 'viewed',
    sentAt: '2024-01-10T14:00:00Z',
    viewedAt: '2024-01-10T16:45:00Z',
    expiresAt: '2024-02-10T23:59:59Z',
    totalValue: 800,
    depositRequired: 200,
    depositPaid: 200,
    signers: [
      { name: 'Marcus Johnson', email: 'marcus.j@email.com', status: 'signed', signedAt: '2024-01-11T10:00:00Z' },
      { name: 'Lisa Johnson', email: 'lisa.j@email.com', status: 'pending' },
    ],
    templateId: 'portrait-family',
    notes: '2hr session, 75 edited photos, 8x10 album',
    createdAt: '2024-01-05T15:00:00Z',
    updatedAt: '2024-01-10T16:45:00Z',
  },
  {
    id: '3',
    clientId: '3',
    clientName: 'Emily Rodriguez',
    clientEmail: 'emily.r@email.com',
    title: 'Rodriguez Engagement Session Contract',
    type: 'engagement',
    status: 'sent',
    sentAt: '2024-01-12T11:30:00Z',
    expiresAt: '2024-02-12T23:59:59Z',
    totalValue: 600,
    depositRequired: 150,
    depositPaid: 0,
    signers: [
      { name: 'Emily Rodriguez', email: 'emily.r@email.com', status: 'pending' },
      { name: 'James Wilson', email: 'james.w@email.com', status: 'pending' },
    ],
    templateId: 'engagement',
    notes: '2hr sunset session, dog included, digital gallery',
    createdAt: '2024-01-12T11:00:00Z',
    updatedAt: '2024-01-12T11:30:00Z',
  },
  {
    id: '4',
    clientId: '4',
    clientName: 'David Park',
    clientEmail: 'david.park@email.com',
    title: 'Park Corporate Headshots Agreement',
    type: 'corporate',
    status: 'completed',
    sentAt: '2023-11-25T10:00:00Z',
    viewedAt: '2023-11-25T14:00:00Z',
    signedAt: '2023-11-26T09:00:00Z',
    expiresAt: '2024-01-08T23:59:59Z',
    totalValue: 1200,
    depositRequired: 600,
    depositPaid: 600,
    signers: [
      { name: 'David Park', email: 'david.park@email.com', status: 'signed', signedAt: '2023-11-26T09:00:00Z' },
    ],
    templateId: 'corporate-headshots',
    notes: '15 employees, white backdrop, 48hr delivery',
    createdAt: '2023-11-20T10:00:00Z',
    updatedAt: '2024-01-08T13:00:00Z',
  },
]

function getStatusBadge(status: Contract['status']) {
  const statusConfig = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
    sent: { label: 'Sent', className: 'bg-blue-100 text-blue-800' },
    viewed: { label: 'Viewed', className: 'bg-yellow-100 text-yellow-800' },
    signed: { label: 'Signed', className: 'bg-green-100 text-green-800' },
    completed: { label: 'Completed', className: 'bg-purple-100 text-purple-800' },
    expired: { label: 'Expired', className: 'bg-red-100 text-red-800' },
    declined: { label: 'Declined', className: 'bg-orange-100 text-orange-800' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600' },
  }
  const config = statusConfig[status]
  return <Badge className={config.className}>{config.label}</Badge>
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
  isLoading?: boolean
}

export function ContractList({ studioSlug, isLoading = false }: ContractListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [contracts, setContracts] = React.useState<Contract[]>(mockContracts)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<string>('createdAt')
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

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this contract?')) {
      setContracts(prev => prev.filter(c => c.id !== id))
      setSelectedContracts(prev => prev.filter(g => g !== id))
    }
  }

  const handleBulkAction = (action: 'delete' | 'resend' | 'cancel') => {
    if (selectedContracts.length === 0) return

    switch (action) {
      case 'delete':
        if (confirm(`Delete ${selectedContracts.length} contracts?`)) {
          setContracts(prev => prev.filter(c => !selectedContracts.includes(c.id)))
          setSelectedContracts([])
        }
        break
      case 'resend':
        console.log('Resending contracts:', selectedContracts)
        break
      case 'cancel':
        setContracts(prev =>
          prev.map(c =>
            selectedContracts.includes(c.id) ? { ...c, status: 'cancelled' as const } : c
          )
        )
        setSelectedContracts([])
        break
    }
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
          <h1 className="text-display-md font-display font-bold text-foreground">Contracts</h1>
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
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('resend')}>
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Resend
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
                      className="rounded border-input"
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
                          className="rounded border-input"
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
                            <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" title="Pending" />
                          ) : contract.status === 'signed' || contract.status === 'completed' ? (
                            <span className="h-2 w-2 rounded-full bg-green-500" title="All signed" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-gray-400" title="Not sent" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden xl:table-cell font-medium">
                        {contract.depositPaid < contract.depositRequired ? (
                          <span className="text-destructive">${(contract.depositRequired - contract.depositPaid).toLocaleString()} deposit due</span>
                        ) : (
                          <span className="text-success">Deposit paid</span>
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
                                <DropdownMenuItem onClick={() => {
                                  setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: 'sent' as const, sentAt: new Date().toISOString() } : c))
                                }}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send for Signature
                                </DropdownMenuItem>
                              </>
                            )}
                            {contract.status === 'sent' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: 'cancelled' as const } : c))
                                }} className="text-destructive">
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
                        className="rounded border-input mt-1"
                      />
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
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
                      <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                    ) : contract.status === 'signed' || contract.status === 'completed' ? (
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
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
                      ${contract.depositPaid.toLocaleString()} / ${contract.depositRequired.toLocaleString()} deposit
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/${studioSlug}/contracts/${contract.id}`}>
                          View
                        </Link>
                      </Button>
                      {contract.status === 'draft' && (
                        <Button variant="default" size="sm" onClick={() => {
                          setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: 'sent' as const, sentAt: new Date().toISOString() } : c))
                        }}>
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
    </div>
  )
}
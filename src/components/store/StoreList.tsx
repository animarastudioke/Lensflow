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
  Package,
  ShoppingCart,
  Eye,
  MoreVertical,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  LayoutGrid,
  LayoutList,
  DollarSign,
  ArrowUpDown,
  Truck,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Product {
  id: string
  name: string
  description: string
  type: 'digital' | 'print' | 'album' | 'package' | 'service'
  status: 'active' | 'draft' | 'archived'
  price: number
  salePrice?: number
  cost?: number
  inventory?: number | null
  sku?: string
  images: string[]
  tags: string[]
  featured: boolean
  salesCount: number
  revenue: number
  createdAt: string
  updatedAt: string
}

interface Order {
  id: string
  orderNumber: string
  clientId: string
  clientName: string
  clientEmail: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  items: {
    productId: string
    productName: string
    quantity: number
    price: number
    total: number
  }[]
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded'
  paymentMethod?: string
  shippingAddress?: string
  trackingNumber?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Digital Gallery - 1 Year',
    description: 'Online gallery hosting for 1 year with download access',
    type: 'digital',
    status: 'active',
    price: 99,
    cost: 5,
    inventory: null,
    sku: 'DIG-GAL-1YR',
    images: [],
    tags: ['digital', 'gallery', 'hosting'],
    featured: true,
    salesCount: 47,
    revenue: 4653,
    createdAt: '2023-06-01T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
  },
  {
    id: '2',
    name: 'Premium Wedding Album 10x10',
    description: 'Layflat premium album, 30 pages, linen cover',
    type: 'album',
    status: 'active',
    price: 450,
    salePrice: 399,
    cost: 180,
    inventory: 15,
    sku: 'ALB-WED-10X10',
    images: [],
    tags: ['album', 'wedding', 'premium', 'print'],
    featured: true,
    salesCount: 23,
    revenue: 9177,
    createdAt: '2023-07-15T10:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
  },
  {
    id: '3',
    name: '8x10 Fine Art Print',
    description: 'Museum-quality fine art print on archival paper',
    type: 'print',
    status: 'active',
    price: 45,
    cost: 12,
    inventory: 100,
    sku: 'PRT-8X10-FA',
    images: [],
    tags: ['print', 'fine-art', 'wall-art'],
    featured: false,
    salesCount: 89,
    revenue: 4005,
    createdAt: '2023-08-01T10:00:00Z',
    updatedAt: '2024-01-12T11:00:00Z',
  },
  {
    id: '4',
    name: 'Wedding Photography Package',
    description: '8hr coverage, 850+ photos, highlight video, album',
    type: 'package',
    status: 'active',
    price: 4500,
    cost: 800,
    inventory: null,
    sku: 'PKG-WED-PREM',
    images: [],
    tags: ['wedding', 'package', 'photography', 'video'],
    featured: true,
    salesCount: 12,
    revenue: 54000,
    createdAt: '2023-05-01T10:00:00Z',
    updatedAt: '2024-01-05T15:00:00Z',
  },
]

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    clientId: '1',
    clientName: 'Sarah Chen',
    clientEmail: 'sarah.chen@email.com',
    status: 'delivered',
    items: [
      { productId: '2', productName: 'Premium Wedding Album 10x10', quantity: 1, price: 399, total: 399 },
      { productId: '3', productName: '8x10 Fine Art Print', quantity: 2, price: 45, total: 90 },
    ],
    subtotal: 489,
    tax: 39.12,
    shipping: 15,
    discount: 0,
    total: 543.12,
    paymentStatus: 'paid',
    paymentMethod: 'Credit Card',
    shippingAddress: '123 Main St, San Francisco, CA 94102',
    trackingNumber: '1Z999AA10123456784',
    notes: 'Gift wrapping requested',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-22T14:30:00Z',
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    clientId: '2',
    clientName: 'Marcus Johnson',
    clientEmail: 'marcus.j@email.com',
    status: 'shipped',
    items: [
      { productId: '1', productName: 'Digital Gallery - 1 Year', quantity: 1, price: 99, total: 99 },
    ],
    subtotal: 99,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 99,
    paymentStatus: 'paid',
    paymentMethod: 'PayPal',
    trackingNumber: '1Z999AA10123456785',
    createdAt: '2024-01-18T15:00:00Z',
    updatedAt: '2024-01-20T09:00:00Z',
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    clientId: '3',
    clientName: 'Emily Rodriguez',
    clientEmail: 'emily.r@email.com',
    status: 'processing',
    items: [
      { productId: '4', productName: 'Wedding Photography Package', quantity: 1, price: 4500, total: 4500 },
    ],
    subtotal: 4500,
    tax: 0,
    shipping: 0,
    discount: 450,
    total: 4050,
    paymentStatus: 'partial',
    paymentMethod: 'Bank Transfer',
    notes: 'Deposit paid, balance due before wedding',
    createdAt: '2024-01-20T11:00:00Z',
    updatedAt: '2024-01-20T11:00:00Z',
  },
]

function getProductStatusBadge(status: Product['status']) {
  const statusConfig = {
    active: { label: 'Active', variant: 'success' as const },
    draft: { label: 'Draft', variant: 'secondary' as const },
    archived: { label: 'Archived', variant: 'secondary' as const },
  }
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function getOrderStatusBadge(status: Order['status']) {
  const statusConfig = {
    pending: { label: 'Pending', variant: 'secondary' as const },
    processing: { label: 'Processing', variant: 'info' as const },
    shipped: { label: 'Shipped', variant: 'default' as const },
    delivered: { label: 'Delivered', variant: 'success' as const },
    cancelled: { label: 'Cancelled', variant: 'destructive' as const },
    refunded: { label: 'Refunded', variant: 'outline' as const },
  }
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface StoreListProps {
  studioSlug: string
  isLoading?: boolean
}

export function StoreList({ studioSlug, isLoading = false }: StoreListProps) {
  const [activeTab, setActiveTab] = React.useState<'products' | 'orders'>('products')
  const [products, setProducts] = React.useState<Product[]>(mockProducts)
  const [orders, setOrders] = React.useState<Order[]>(mockOrders)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [sortBy] = React.useState<string>('createdAt')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [selectedItems, setSelectedItems] = React.useState<string[]>([])

  // Filter and sort products
  const filteredProducts = React.useMemo(() => {
    let result = [...products]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      result = result.filter(p => p.type === typeFilter)
    }

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof Product]
      const bVal = b[sortBy as keyof Product]
      if (aVal === undefined || bVal === undefined) return 0
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [products, searchQuery, statusFilter, typeFilter, sortBy, sortOrder])

  // Filter and sort orders
  const filteredOrders = React.useMemo(() => {
    let result = [...orders]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        o =>
          o.orderNumber.toLowerCase().includes(query) ||
          o.clientName.toLowerCase().includes(query) ||
          o.clientEmail.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter)
    }

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof Order]
      const bVal = b[sortBy as keyof Order]
      if (aVal === undefined || bVal === undefined) return 0
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [orders, searchQuery, statusFilter, sortBy, sortOrder])

  const [deleteProductConfirm, setDeleteProductConfirm] = React.useState<string | null>(null)
  const [deleteOrderConfirm, setDeleteOrderConfirm] = React.useState<string | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = React.useState(false)

  const handleProductDelete = (id: string) => {
    setDeleteProductConfirm(id)
  }

  const confirmProductDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
    setSelectedItems(prev => prev.filter(g => g !== id))
    setDeleteProductConfirm(null)
  }

  const handleOrderDelete = (id: string) => {
    setDeleteOrderConfirm(id)
  }

  const confirmOrderDelete = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id))
    setSelectedItems(prev => prev.filter(g => g !== id))
    setDeleteOrderConfirm(null)
  }

  const confirmBulkDelete = () => {
    setProducts(prev => prev.filter(p => !selectedItems.includes(p.id)))
    setSelectedItems([])
    setBulkDeleteConfirm(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = (items: (Product | Order)[]) => {
    if (selectedItems.length === items.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(items.map(i => i.id))
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

  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0)
  const totalSales = products.reduce((sum, p) => sum + p.salesCount, 0)
  const activeProducts = products.filter(p => p.status === 'active').length
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border">
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
            <span className="label-caption">Total sales</span>
            <ShoppingCart className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {totalSales}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Active products</span>
            <Package className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {activeProducts}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Pending orders</span>
            <AlertCircle className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-destructive tabular-nums">
            {pendingOrders}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
        </TabsList>

        {activeTab === 'products' && (
          <TabsContent value="products" className="space-y-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-display-md font-display font-semibold text-foreground">Products</h1>
                <p className="text-body text-muted-foreground mt-1">Manage your store products and inventory</p>
              </div>
              <Link href={`/dashboard/${studioSlug}/store/products/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </Link>
            </div>

            {/* View Toggle & Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-4">
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
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="digital">Digital</SelectItem>
                        <SelectItem value="print">Print</SelectItem>
                        <SelectItem value="album">Album</SelectItem>
                        <SelectItem value="package">Package</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
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
            {selectedItems.length > 0 && (
              <Card className="border-primary bg-primary/5">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedItems.length} product{selectedItems.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setProducts(prev => prev.map(p => selectedItems.includes(p.id) ? { ...p, status: 'archived' as const } : p))
                        setSelectedItems([])
                      }}>
                        Archive
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Products Content */}
            {viewMode === 'table' ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedItems.length === filteredProducts.length && filteredProducts.length > 0}
                            onChange={() => toggleSelectAll(filteredProducts)}
                            aria-label="Select all products"
                            className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                          />
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="hidden md:table-cell">Type</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Price</TableHead>
                        <TableHead className="hidden xl:table-cell">Inventory</TableHead>
                        <TableHead className="hidden xl:table-cell">Sales</TableHead>
                        <TableHead className="text-right hidden xl:table-cell">Revenue</TableHead>
                        <TableHead className="w-48">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">No products found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => (
                          <TableRow key={product.id} className="hover:bg-muted/50">
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(product.id)}
                                onChange={() => toggleSelect(product.id)}
                                aria-label={`Select ${product.name}`}
                                className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">{product.description}</p>
                                {product.sku && <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="text-xs">{product.type}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {getProductStatusBadge(product.status)}
                              {product.featured && <Badge variant="secondary" className="ml-1 text-xs">Featured</Badge>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell font-mono tabular-nums text-sm font-medium">
                              {product.salePrice ? (
                                <>
                                  <span className="line-through text-muted-foreground">${product.price.toLocaleString()}</span>
                                  <span className="ml-2 text-primary">${product.salePrice.toLocaleString()}</span>
                                </>
                              ) : (
                                <span>${product.price.toLocaleString()}</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-sm text-muted-foreground font-mono tabular-nums">
                              {product.inventory !== null ? product.inventory : '∞'}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                              {product.salesCount} sold
                            </TableCell>
                            <TableCell className="text-right hidden xl:table-cell font-mono tabular-nums text-sm font-medium">
                              ${product.revenue.toLocaleString()}
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
                                    <Link href={`/dashboard/${studioSlug}/store/products/${product.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/${studioSlug}/store/products/${product.id}/edit`}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleProductDelete(product.id)}
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
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No products found</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <Card key={product.id} className="card-hover">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(product.id)}
                              onChange={() => toggleSelect(product.id)}
                              aria-label={`Select ${product.name}`}
                              className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary mt-1"
                            />
                            <div className="min-w-0">
                              <h3 className="font-semibold truncate">{product.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                {getProductStatusBadge(product.status)}
                                <Badge variant="outline" className="text-xs">{product.type}</Badge>
                                {product.featured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
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
                                <Link href={`/dashboard/${studioSlug}/store/products/${product.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleProductDelete(product.id)}
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
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="font-mono tabular-nums font-medium text-lg">
                            {product.salePrice ? (
                              <>
                                <span className="line-through text-muted-foreground text-sm">${product.price.toLocaleString()}</span>
                                <span className="ml-2 text-primary">${product.salePrice.toLocaleString()}</span>
                              </>
                            ) : (
                              <span>${product.price.toLocaleString()}</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {product.salesCount} sales
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/${studioSlug}/store/products/${product.id}`}>
                              View
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/${studioSlug}/store/products/${product.id}/edit`}>
                              Edit
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        )}

        {activeTab === 'orders' && (
          <TabsContent value="orders" className="space-y-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-display-md font-display font-semibold text-foreground">Orders</h1>
                <p className="text-body text-muted-foreground mt-1">Manage customer orders and fulfillment</p>
              </div>
            </div>

            {/* Orders Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === filteredOrders.length && filteredOrders.length > 0}
                          onChange={() => toggleSelectAll(filteredOrders)}
                          aria-label="Select all orders"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                        />
                      </TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Payment</TableHead>
                      <TableHead className="text-right hidden xl:table-cell">Total</TableHead>
                      <TableHead className="w-48">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                          <p className="text-muted-foreground">No orders found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/50">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(order.id)}
                              onChange={() => toggleSelect(order.id)}
                              aria-label={`Select order ${order.orderNumber}`}
                              className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium font-mono">{order.orderNumber}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src="" alt={order.clientName} />
                                <AvatarFallback className="text-xs">
                                  {order.clientName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{order.clientName}</p>
                                <p className="text-xs text-muted-foreground">{order.clientEmail}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <p className="text-sm">{format(new Date(order.createdAt), 'MMM d, yyyy')}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {getOrderStatusBadge(order.status)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'partial' ? 'warning' : 'outline'} className="text-xs">
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right hidden xl:table-cell font-mono tabular-nums text-sm font-medium">
                            ${order.total.toLocaleString()}
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
                                  <Link href={`/dashboard/${studioSlug}/store/orders/${order.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {order.status === 'processing' && (
                                  <DropdownMenuItem onClick={() => {
                                    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'shipped' as const } : o))
                                  }}>
                                    <Truck className="mr-2 h-4 w-4" />
                                    Mark Shipped
                                  </DropdownMenuItem>
                                )}
                                {order.status === 'shipped' && (
                                  <DropdownMenuItem onClick={() => {
                                    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivered' as const } : o))
                                  }}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                    Mark Delivered
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleOrderDelete(order.id)}
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
          </TabsContent>
        )}
      </Tabs>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {activeTab === 'products' ? filteredProducts.length : filteredOrders.length} of {activeTab === 'products' ? products.length : orders.length} {activeTab}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>

      {/* Delete product confirmation */}
      <Dialog open={!!deleteProductConfirm} onOpenChange={(open) => !open && setDeleteProductConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProductConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteProductConfirm && confirmProductDelete(deleteProductConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete order confirmation */}
      <Dialog open={!!deleteOrderConfirm} onOpenChange={(open) => !open && setDeleteOrderConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOrderConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteOrderConfirm && confirmOrderDelete(deleteOrderConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation */}
      <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selectedItems.length} product{selectedItems.length !== 1 ? 's' : ''}</DialogTitle>
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

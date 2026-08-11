'use client'

import * as React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/currencies'
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
import { toast } from 'sonner'
import { deleteProduct, archiveProducts, type ProductRow } from '@/lib/actions/products'
import { deleteOrder, updateOrderStatus, type OrderRow } from '@/lib/actions/orders'

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

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    type: row.type,
    status: row.status,
    price: row.price,
    salePrice: row.sale_price ?? undefined,
    cost: row.cost ?? undefined,
    inventory: row.inventory,
    sku: row.sku ?? undefined,
    images: row.images,
    tags: row.tags,
    featured: row.featured,
    salesCount: row.sales_count,
    revenue: row.revenue,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    clientId: row.client_id ?? '',
    clientName: row.client?.name ?? 'No client',
    clientEmail: row.client?.email ?? '',
    status: row.status,
    items: row.items.map((item) => ({
      productId: item.product_id ?? '',
      productName: item.product_name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    })),
    subtotal: row.subtotal,
    tax: row.tax,
    shipping: row.shipping,
    discount: row.discount,
    total: row.total,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method ?? undefined,
    shippingAddress: row.shipping_address ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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
  initialProducts: ProductRow[]
  initialOrders: OrderRow[]
  isLoading?: boolean
  currency?: string
}

export function StoreList({ studioSlug, initialProducts, initialOrders, isLoading = false, currency = 'USD' }: StoreListProps) {
  const [activeTab, setActiveTab] = React.useState<'products' | 'orders'>('products')
  const [products, setProducts] = React.useState<Product[]>(() => initialProducts.map(mapProductRow))
  const [orders, setOrders] = React.useState<Order[]>(() => initialOrders.map(mapOrderRow))
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

  const confirmProductDelete = async (id: string) => {
    const result = await deleteProduct(id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setProducts(prev => prev.filter(p => p.id !== id))
    setSelectedItems(prev => prev.filter(g => g !== id))
    setDeleteProductConfirm(null)
  }

  const handleOrderDelete = (id: string) => {
    setDeleteOrderConfirm(id)
  }

  const confirmOrderDelete = async (id: string) => {
    const result = await deleteOrder(id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setOrders(prev => prev.filter(o => o.id !== id))
    setSelectedItems(prev => prev.filter(g => g !== id))
    setDeleteOrderConfirm(null)
  }

  const handleOrderStatusChange = async (orderId: string, status: Order['status']) => {
    const result = await updateOrderStatus(orderId, studioSlug, status)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
  }

  const confirmBulkDelete = async () => {
    const ids = selectedItems
    const results = await Promise.all(ids.map(id => deleteProduct(id, studioSlug)))
    const failed = results.some(r => r?.error)
    if (failed) {
      toast.error('Some products could not be deleted')
    }
    setProducts(prev => prev.filter(p => !ids.includes(p.id)))
    setSelectedItems([])
    setBulkDeleteConfirm(false)
  }

  const handleBulkArchive = async () => {
    const ids = selectedItems
    const result = await archiveProducts(ids, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'archived' as const } : p))
    setSelectedItems([])
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
            {formatCurrency(totalRevenue, currency)}
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
                      <Button variant="outline" size="sm" onClick={handleBulkArchive}>
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
                                  <span className="line-through text-muted-foreground">{formatCurrency(product.price, currency)}</span>
                                  <span className="ml-2 text-primary">{formatCurrency(product.salePrice, currency)}</span>
                                </>
                              ) : (
                                <span>{formatCurrency(product.price, currency)}</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-sm text-muted-foreground font-mono tabular-nums">
                              {product.inventory !== null ? product.inventory : '∞'}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                              {product.salesCount} sold
                            </TableCell>
                            <TableCell className="text-right hidden xl:table-cell font-mono tabular-nums text-sm font-medium">
                              {formatCurrency(product.revenue, currency)}
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
                                <span className="line-through text-muted-foreground text-sm">{formatCurrency(product.price, currency)}</span>
                                <span className="ml-2 text-primary">{formatCurrency(product.salePrice, currency)}</span>
                              </>
                            ) : (
                              <span>{formatCurrency(product.price, currency)}</span>
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
                            {formatCurrency(order.total, currency)}
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
                                  <DropdownMenuItem onClick={() => handleOrderStatusChange(order.id, 'shipped')}>
                                    <Truck className="mr-2 h-4 w-4" />
                                    Mark Shipped
                                  </DropdownMenuItem>
                                )}
                                {order.status === 'shipped' && (
                                  <DropdownMenuItem onClick={() => handleOrderStatusChange(order.id, 'delivered')}>
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

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
  Globe,
  Eye,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  Palette,
  Layout,
  Image as ImageIcon,
  Settings,
  CheckCircle,
  XCircle,
  Copy,
  ArrowUpDown,
  LayoutList,
  LayoutGrid,
  BarChart3,
  Users,
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Website {
  id: string
  name: string
  domain?: string
  subdomain: string
  status: 'published' | 'draft' | 'archived'
  template: string
  templateName: string
  pages: {
    id: string
    name: string
    path: string
    isPublished: boolean
  }[]
  visits: number
  uniqueVisitors: number
  theme: {
    primaryColor: string
    font: string
  }
  seo: {
    title: string
    description: string
    ogImage?: string
  }
  customDomain?: string
  sslEnabled: boolean
  passwordProtected: boolean
  password?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

const mockWebsites: Website[] = [
  {
    id: '1',
    name: 'Main Portfolio',
    domain: 'mystudio.com',
    subdomain: 'mystudio',
    status: 'published',
    template: 'modern-minimal',
    templateName: 'Modern Minimal',
    pages: [
      { id: 'home', name: 'Home', path: '/', isPublished: true },
      { id: 'galleries', name: 'Galleries', path: '/galleries', isPublished: true },
      { id: 'about', name: 'About', path: '/about', isPublished: true },
      { id: 'contact', name: 'Contact', path: '/contact', isPublished: true },
      { id: 'pricing', name: 'Pricing', path: '/pricing', isPublished: false },
    ],
    visits: 12450,
    uniqueVisitors: 8920,
    theme: {
      primaryColor: '#3B82F6',
      font: 'Inter',
    },
    seo: {
      title: 'My Studio - Professional Photography',
      description: 'Award-winning wedding and portrait photography studio based in San Francisco.',
    },
    customDomain: 'mystudio.com',
    sslEnabled: true,
    passwordProtected: false,
    createdAt: '2023-06-01T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    publishedAt: '2023-06-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Wedding Landing Page',
    subdomain: 'weddings',
    status: 'published',
    template: 'elegant-wedding',
    templateName: 'Elegant Wedding',
    pages: [
      { id: 'home', name: 'Home', path: '/', isPublished: true },
      { id: 'packages', name: 'Packages', path: '/packages', isPublished: true },
      { id: 'gallery', name: 'Gallery', path: '/gallery', isPublished: true },
      { id: 'contact', name: 'Contact', path: '/contact', isPublished: true },
    ],
    visits: 8320,
    uniqueVisitors: 5640,
    theme: {
      primaryColor: '#EC4899',
      font: 'Playfair Display',
    },
    seo: {
      title: 'Wedding Photography | My Studio',
      description: 'Elegant wedding photography packages for your special day.',
    },
    sslEnabled: true,
    passwordProtected: false,
    createdAt: '2023-08-15T10:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
    publishedAt: '2023-09-01T10:00:00Z',
  },
  {
    id: '3',
    name: 'New Portfolio Draft',
    subdomain: 'portfolio-v2',
    status: 'draft',
    template: 'modern-minimal',
    templateName: 'Modern Minimal',
    pages: [
      { id: 'home', name: 'Home', path: '/', isPublished: false },
      { id: 'galleries', name: 'Galleries', path: '/galleries', isPublished: false },
      { id: 'about', name: 'About', path: '/about', isPublished: false },
    ],
    visits: 0,
    uniqueVisitors: 0,
    theme: {
      primaryColor: '#10B981',
      font: 'Inter',
    },
    seo: {
      title: 'My Studio - New Portfolio',
      description: 'Coming soon...',
    },
    sslEnabled: true,
    passwordProtected: true,
    password: 'preview123',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
  },
]

function getStatusBadge(status: Website['status']) {
  const statusConfig = {
    published: { label: 'Published', className: 'bg-green-100 text-green-800' },
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
    archived: { label: 'Archived', className: 'bg-gray-100 text-gray-600' },
  }
  const config = statusConfig[status]
  return <Badge className={config.className}>{config.label}</Badge>
}

interface WebsiteListProps {
  studioSlug: string
  isLoading?: boolean
}

export function WebsiteList({ studioSlug, isLoading = false }: WebsiteListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [websites, setWebsites] = React.useState<Website[]>(mockWebsites)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<string>('updatedAt')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [selectedWebsites, setSelectedWebsites] = React.useState<string[]>([])

  // Filter and sort websites
  const filteredWebsites = React.useMemo(() => {
    let result = [...websites]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        w =>
          w.name.toLowerCase().includes(query) ||
          w.subdomain.toLowerCase().includes(query) ||
          w.domain?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(w => w.status === statusFilter)
    }

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof Website]
      const bVal = b[sortBy as keyof Website]
      if (aVal === undefined || bVal === undefined) return 0
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [websites, searchQuery, statusFilter, sortBy, sortOrder])

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this website?')) {
      setWebsites(prev => prev.filter(w => w.id !== id))
      setSelectedWebsites(prev => prev.filter(g => g !== id))
    }
  }

  const handlePublish = (id: string) => {
    setWebsites(prev => prev.map(w => w.id === id ? { ...w, status: 'published' as const, publishedAt: new Date().toISOString() } : w))
  }

  const handleUnpublish = (id: string) => {
    setWebsites(prev => prev.map(w => w.id === id ? { ...w, status: 'draft' as const } : w))
  }

  const handleDuplicate = (id: string) => {
    const website = websites.find(w => w.id === id)
    if (website) {
      const newWebsite: Website = {
        ...website,
        id: `${website.id}-copy-${Date.now()}`,
        name: `${website.name} (Copy)`,
        subdomain: `${website.subdomain}-copy`,
        status: 'draft',
        visits: 0,
        uniqueVisitors: 0,
        publishedAt: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setWebsites(prev => [...prev, newWebsite])
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedWebsites(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedWebsites.length === filteredWebsites.length) {
      setSelectedWebsites([])
    } else {
      setSelectedWebsites(filteredWebsites.map(w => w.id))
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

  const totalVisits = websites.reduce((sum, w) => sum + w.visits, 0)
  const totalVisitors = websites.reduce((sum, w) => sum + w.uniqueVisitors, 0)
  const publishedCount = websites.filter(w => w.status === 'published').length

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Visits</p>
                <p className="text-2xl font-bold">{totalVisits.toLocaleString()}</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unique Visitors</p>
                <p className="text-2xl font-bold">{totalVisitors.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published Sites</p>
                <p className="text-2xl font-bold">{publishedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sites</p>
                <p className="text-2xl font-bold">{websites.length}</p>
              </div>
              <Layout className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display font-bold text-foreground">Website Builder</h1>
          <p className="text-body text-muted-foreground mt-1">Create and manage your portfolio websites</p>
        </div>
        <Link href={`/dashboard/${studioSlug}/website/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Website
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
                  placeholder="Search websites..."
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
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
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
      {selectedWebsites.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedWebsites.length} website{selectedWebsites.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  selectedWebsites.forEach(id => handlePublish(id))
                  setSelectedWebsites([])
                }}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Publish
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  selectedWebsites.forEach(id => handleUnpublish(id))
                  setSelectedWebsites([])
                }}>
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Unpublish
                </Button>
                <Button variant="destructive" size="sm" onClick={() => {
                  if (confirm(`Delete ${selectedWebsites.length} websites?`)) {
                    setWebsites(prev => prev.filter(w => !selectedWebsites.includes(w.id)))
                    setSelectedWebsites([])
                  }
                }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Website Content */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedWebsites.length === filteredWebsites.length && filteredWebsites.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-input"
                    />
                  </TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="hidden md:table-cell">Domain</TableHead>
                  <TableHead className="hidden md:table-cell">Template</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Pages</TableHead>
                  <TableHead className="hidden xl:table-cell">Visits</TableHead>
                  <TableHead className="hidden xl:table-cell">Visitors</TableHead>
                  <TableHead className="w-56">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWebsites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No websites found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWebsites.map((website) => (
                    <TableRow key={website.id} className="hover:bg-muted/50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedWebsites.includes(website.id)}
                          onChange={() => toggleSelect(website.id)}
                          className="rounded border-input"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{website.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {website.templateName} • {website.pages.length} pages
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          {website.customDomain && (
                            <p className="font-mono text-sm">{website.customDomain}</p>
                          )}
                          <p className="text-sm text-muted-foreground font-mono">
                            {website.subdomain}.lensflow.app
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{website.templateName}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getStatusBadge(website.status)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {website.pages.filter(p => p.isPublished).length}/{website.pages.length} published
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {website.visits.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {website.uniqueVisitors.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/${studioSlug}/website/${website.id}/editor`}>
                                  <Layout className="mr-2 h-4 w-4" />
                                  Edit Website
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`https://${website.customDomain || website.subdomain}.lensflow.app`} target="_blank">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View Live
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/${studioSlug}/website/${website.id}/analytics`}>
                                  <BarChart3 className="mr-2 h-4 w-4" />
                                  Analytics
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDuplicate(website.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {website.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handlePublish(website.id)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              {website.status === 'published' && (
                                <DropdownMenuItem onClick={() => handleUnpublish(website.id)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Unpublish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(website.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dashboard/${studioSlug}/website/${website.id}/editor`}>
                              <Layout className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`https://${website.customDomain || website.subdomain}.lensflow.app`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
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
          {filteredWebsites.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No websites found</p>
            </div>
          ) : (
            filteredWebsites.map((website) => (
              <Card key={website.id} className="card-hover">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedWebsites.includes(website.id)}
                        onChange={() => toggleSelect(website.id)}
                        className="rounded border-input mt-1"
                      />
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{website.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(website.status)}
                          <Badge variant="outline" className="text-xs">{website.templateName}</Badge>
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
                          <Link href={`/dashboard/${studioSlug}/website/${website.id}/editor`}>
                            <Layout className="mr-2 h-4 w-4" />
                            Edit Website
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`https://${website.customDomain || website.subdomain}.lensflow.app`} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Live
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDuplicate(website.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(website.id)}
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
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="font-mono truncate max-w-[200px]">
                      {website.customDomain || `${website.subdomain}.lensflow.app`}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{website.visits.toLocaleString()} visits</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{website.uniqueVisitors.toLocaleString()} visitors</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{website.pages.filter(p => p.isPublished).length}/{website.pages.length} pages published</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/${studioSlug}/website/${website.id}/editor`}>
                          <Layout className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Link>
                      </Button>
                      <Button variant="default" size="sm" asChild>
                        <Link href={`https://${website.customDomain || website.subdomain}.lensflow.app`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          View Live
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
          Showing {filteredWebsites.length} of {websites.length} websites
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  )
}

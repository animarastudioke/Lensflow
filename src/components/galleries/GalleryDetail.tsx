'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
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
  MoreVertical,
  Trash2,
  Edit,
  Share2,
  Download,
  ArrowLeft,
  Image as ImageIcon,
  LayoutGrid,
  LayoutList,
  X,
  Heart,
  MoreHorizontal,
  Upload,
  User,
  Calendar,
  MapPin,
  Eye,
  Square,
  Settings,
  BarChart3,
  ArrowUpDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import Image from 'next/image'

interface GalleryImage {
  id: string
  filename: string
  url: string
  thumbnailUrl: string
  width: number
  height: number
  size: number
  mimeType: string
  caption?: string
  tags: string[]
  isFavorite: boolean
  sortOrder: number
  uploadedAt: string
}

interface Album {
  id: string
  name: string
  description?: string
  coverImageId?: string
  imageCount: number
  isPublic: boolean
  sortOrder: number
  createdAt: string
}

interface Gallery {
  id: string
  name: string
  slug: string
  description?: string
  coverImageId?: string
  status: 'draft' | 'published' | 'archived' | 'expired'
  type: 'client' | 'portfolio' | 'store' | 'proofing'
  visibility: 'private' | 'unlisted' | 'public' | 'password'
  password?: string
  expiresAt?: string
  downloadEnabled: boolean
  watermarkEnabled: boolean
  allowFavorites: boolean
  allowComments: boolean
  requireEmail: boolean
  sortBy: 'custom' | 'date' | 'name' | 'favorites'
  sortOrder: 'asc' | 'desc'
  images: GalleryImage[]
  albums: Album[]
  clientId?: string
  clientName?: string
  clientEmail?: string
  shootDate?: string
  location?: string
  settings: {
    theme: string
    primaryColor: string
    logoUrl?: string
    customCss?: string
    shareMessage?: string
  }
  stats: {
    views: number
    downloads: number
    favorites: number
    shares: number
  }
  createdAt: string
  updatedAt: string
}

const mockGallery: Gallery = {
  id: '1',
  name: 'Sarah & Marcus Wedding',
  slug: 'sarah-marcus-wedding',
  description: 'A beautiful wedding ceremony at the botanical gardens',
  status: 'published',
  type: 'client',
  visibility: 'unlisted',
  downloadEnabled: true,
  watermarkEnabled: true,
  allowFavorites: true,
  allowComments: true,
  requireEmail: false,
  sortBy: 'custom',
  sortOrder: 'asc',
  clientId: '1',
  clientName: 'Sarah Chen',
  clientEmail: 'sarah.chen@email.com',
  shootDate: '2024-06-15',
  location: 'Brooklyn Botanical Garden, NYC',
  settings: {
    theme: 'minimal',
    primaryColor: '#3B82F6',
    shareMessage: 'Check out our wedding photos!',
  },
  images: [
    {
      id: 'img-1',
      filename: 'wedding-001.jpg',
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
      width: 4000,
      height: 3000,
      size: 5200000,
      mimeType: 'image/jpeg',
      caption: 'First look moment',
      tags: ['ceremony', 'first-look', 'emotional'],
      isFavorite: true,
      sortOrder: 1,
      uploadedAt: '2024-06-16T10:00:00Z',
    },
    {
      id: 'img-2',
      filename: 'wedding-002.jpg',
      url: 'https://images.unsplash.com/photo-1518174728327-4e8f3bdfb34f?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518174728327-4e8f3bdfb34f?w=400',
      width: 4000,
      height: 3000,
      size: 4800000,
      mimeType: 'image/jpeg',
      caption: 'Ceremony view',
      tags: ['ceremony', 'venue', 'wide'],
      isFavorite: false,
      sortOrder: 2,
      uploadedAt: '2024-06-16T10:05:00Z',
    },
    {
      id: 'img-3',
      filename: 'wedding-003.jpg',
      url: 'https://images.unsplash.com/photo-1537608706774-6c2422397335?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1537608706774-6c2422397335?w=400',
      width: 3000,
      height: 4000,
      size: 5500000,
      mimeType: 'image/jpeg',
      caption: 'Bridal portrait',
      tags: ['portrait', 'bride', 'details'],
      isFavorite: true,
      sortOrder: 3,
      uploadedAt: '2024-06-16T10:10:00Z',
    },
    {
      id: 'img-4',
      filename: 'wedding-004.jpg',
      url: 'https://images.unsplash.com/photo-1519225421980-715cb0215a67?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215a67?w=400',
      width: 4000,
      height: 3000,
      size: 5100000,
      mimeType: 'image/jpeg',
      caption: 'Reception decor',
      tags: ['reception', 'decor', 'details'],
      isFavorite: false,
      sortOrder: 4,
      uploadedAt: '2024-06-16T10:15:00Z',
    },
    {
      id: 'img-5',
      filename: 'wedding-005.jpg',
      url: 'https://images.unsplash.com/photo-1583939003579-782e4bb033e1?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1583939003579-782e4bb033e1?w=400',
      width: 3000,
      height: 4000,
      size: 4900000,
      mimeType: 'image/jpeg',
      caption: 'First dance',
      tags: ['reception', 'first-dance', 'couple'],
      isFavorite: true,
      sortOrder: 5,
      uploadedAt: '2024-06-16T10:20:00Z',
    },
    {
      id: 'img-6',
      filename: 'wedding-006.jpg',
      url: 'https://images.unsplash.com/photo-1537101871380-782c8b6b6b3b?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1537101871380-782c8b6b6b3b?w=400',
      width: 4000,
      height: 3000,
      size: 5300000,
      mimeType: 'image/jpeg',
      caption: 'Wedding cake',
      tags: ['reception', 'cake', 'details'],
      isFavorite: false,
      sortOrder: 6,
      uploadedAt: '2024-06-16T10:25:00Z',
    },
  ],
  albums: [
    {
      id: 'album-1',
      name: 'Getting Ready',
      description: 'Pre-ceremony preparations',
      imageCount: 25,
      isPublic: true,
      sortOrder: 1,
      createdAt: '2024-06-16T10:00:00Z',
    },
    {
      id: 'album-2',
      name: 'Ceremony',
      description: 'The wedding ceremony',
      imageCount: 45,
      isPublic: true,
      sortOrder: 2,
      createdAt: '2024-06-16T10:00:00Z',
    },
    {
      id: 'album-3',
      name: 'Portraits',
      description: 'Couple and bridal party portraits',
      imageCount: 30,
      isPublic: true,
      sortOrder: 3,
      createdAt: '2024-06-16T10:00:00Z',
    },
    {
      id: 'album-4',
      name: 'Reception',
      description: 'Reception and celebration',
      imageCount: 60,
      isPublic: true,
      sortOrder: 4,
      createdAt: '2024-06-16T10:00:00Z',
    },
  ],
  stats: {
    views: 1247,
    downloads: 89,
    favorites: 234,
    shares: 12,
  },
  createdAt: '2024-06-16T09:00:00Z',
  updatedAt: '2024-06-20T15:30:00Z',
}

function getStatusBadge(status: Gallery['status']) {
  const statusConfig = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
    published: { label: 'Published', className: 'bg-green-100 text-green-800' },
    archived: { label: 'Archived', className: 'bg-gray-100 text-gray-600' },
    expired: { label: 'Expired', className: 'bg-red-100 text-red-800' },
  }
  const config = statusConfig[status]
  return <Badge className={config.className}>{config.label}</Badge>
}

function getTypeBadge(type: Gallery['type']) {
  const typeConfig = {
    client: { label: 'Client', className: 'bg-blue-100 text-blue-800' },
    portfolio: { label: 'Portfolio', className: 'bg-purple-100 text-purple-800' },
    store: { label: 'Store', className: 'bg-green-100 text-green-800' },
    proofing: { label: 'Proofing', className: 'bg-orange-100 text-orange-800' },
  }
  const config = typeConfig[type]
  return <Badge className={config.className}>{config.label}</Badge>
}

function getVisibilityBadge(visibility: Gallery['visibility']) {
  const visibilityConfig = {
    private: { label: 'Private', icon: '🔒' },
    unlisted: { label: 'Unlisted', icon: '🔗' },
    public: { label: 'Public', icon: '🌐' },
    password: { label: 'Password', icon: '🔐' },
  }
  const config = visibilityConfig[visibility]
  return (
    <Badge variant="outline" className="gap-1">
      <span>{config.icon}</span>
      {config.label}
    </Badge>
  )
}

interface GalleryDetailProps {
  studioSlug: string
  galleryId: string
}

export function GalleryDetail({ studioSlug, galleryId: _galleryId }: GalleryDetailProps) {
  const router = useRouter()

  const [gallery, setGallery] = React.useState<Gallery>(mockGallery)
  const [activeTab, setActiveTab] = React.useState<'images' | 'albums' | 'settings' | 'analytics'>('images')
  const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'masonry'>('grid')
  const [selectedImages, setSelectedImages] = React.useState<string[]>([])
  const [, setCurrentImageIndex] = React.useState(0)
  const [, setIsLightboxOpen] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<'custom' | 'date' | 'name' | 'favorites'>('custom')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [, setShowAlbumSidebar] = React.useState(false)
  const [, setLightboxZoom] = React.useState(1)
  const [, setLightboxRotation] = React.useState(0)

  // Filter and sort images
  const filteredImages = React.useMemo(() => {
    let result = [...gallery.images]

    // Filter by album if sidebar is open
    // Album filtering would go here

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
          break
        case 'name':
          comparison = a.filename.localeCompare(b.filename)
          break
        case 'favorites':
          comparison = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)
          break
        case 'custom':
        default:
          comparison = a.sortOrder - b.sortOrder
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [gallery.images, sortBy, sortOrder])

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index)
    setIsLightboxOpen(true)
    setLightboxZoom(1)
    setLightboxRotation(0)
  }

  const handleDeleteImages = () => {
    if (confirm(`Delete ${selectedImages.length} image(s)?`)) {
      setGallery((prev) => ({
        ...prev,
        images: prev.images.filter((img) => !selectedImages.includes(img.id)),
      }))
      setSelectedImages([])
    }
  }

  const handleAddToAlbum = (_albumId: string) => {
    // Add selected images to album
    setSelectedImages([])
  }

  const handleBulkAction = (action: 'delete' | 'favorite' | 'download' | 'album') => {
    if (selectedImages.length === 0) return

    switch (action) {
      case 'delete':
        handleDeleteImages()
        break
      case 'favorite':
        setGallery((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            selectedImages.includes(img.id) ? { ...img, isFavorite: !img.isFavorite } : img
          ),
        }))
        setSelectedImages([])
        break
      case 'download':
        // Trigger download
        break
      case 'album':
        setShowAlbumSidebar(true)
        break
    }
  }

  const toggleImageSelect = (id: string) => {
    setSelectedImages((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([])
    } else {
      setSelectedImages(filteredImages.map((i) => i.id))
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Gallery Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-display-sm font-display font-bold">{gallery.name}</h1>
              {getStatusBadge(gallery.status)}
              {getTypeBadge(gallery.type)}
              {getVisibilityBadge(gallery.visibility)}
            </div>
            {gallery.description && (
              <p className="text-muted-foreground text-sm mt-1">{gallery.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Gallery
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => {}}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button size="sm" onClick={() => {}}>
            <Upload className="h-4 w-4 mr-2" />
            Add Images
          </Button>
        </div>
      </div>

      {/* Gallery Info Bar */}
      <div className="flex flex-wrap items-center gap-4 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {gallery.clientName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{gallery.clientName}</span>
            </div>
          )}
          {gallery.shootDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(gallery.shootDate), 'MMM d, yyyy')}</span>
            </div>
          )}
          {gallery.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{gallery.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <span>{gallery.images.length} images</span>
          </div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span>{gallery.albums.length} albums</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{gallery.stats.views.toLocaleString()} views</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>{gallery.stats.downloads.toLocaleString()} downloads</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-red-500" />
            <span>{gallery.stats.favorites.toLocaleString()} favorites</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="flex-1 flex flex-col">
        <TabsList className="mb-4 bg-transparent">
          <TabsTrigger value="images">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Images ({gallery.images.length})
          </TabsTrigger>
          <TabsTrigger value="albums">
            <Square className="h-4 w-4 mr-2" />
            Albums ({gallery.albums.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Images Tab */}
        <TabsContent value="images" className="flex-1 flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'masonry' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('masonry')}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 flex justify-center">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Order</SelectItem>
                  <SelectItem value="date">Date Uploaded</SelectItem>
                  <SelectItem value="name">File Name</SelectItem>
                  <SelectItem value="favorites">Favorites First</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ArrowUpDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4 rotate-180" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search images..."
                  className="pl-8 w-64"
                />
              </div>

              {selectedImages.length > 0 && (
                <div className="flex items-center gap-2 border-l pl-4">
                  <span className="text-sm text-muted-foreground">
                    {selectedImages.length} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('favorite')}>
                    <Heart className="h-3.5 w-3.5 mr-1.5" />
                    Favorite
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('download')}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('album')}>
                    <Square className="h-3.5 w-3.5 mr-1.5" />
                    Add to Album
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDeleteImages}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedImages([])}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Images Grid/List */}
          <div className="flex-1 overflow-auto">
            {viewMode === 'grid' && (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredImages.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No images in this gallery</p>
                    <Button className="mt-4" asChild>
                      <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}/upload`}>
                        Upload Images
                      </Link>
                    </Button>
                  </div>
                ) : (
                  filteredImages.map((image, index) => (
                    <div
                      key={image.id}
                      className={cn(
                        'relative group aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer transition-all',
                        selectedImages.includes(image.id) &&
                          'ring-2 ring-primary ring-offset-2 scale-[0.98]'
                      )}
                      onClick={() => handleImageClick(index)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        toggleImageSelect(image.id)
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(image.id)}
                        onChange={() => toggleImageSelect(image.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-2 left-2 z-10 rounded border-input bg-white/90"
                      />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {image.isFavorite && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); }}>
                            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                          </Button>
                        )}
                      </div>
                      <Image
                        src={image.thumbnailUrl}
                        alt={image.caption || image.filename}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                      />
                      {image.isFavorite && (
                        <div className="absolute bottom-2 left-2">
                          <Heart className="h-5 w-5 text-red-500 fill-red-500 drop-shadow-lg" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2">
                        <Badge variant="outline" className="text-xs">
                          {index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedImages.length === filteredImages.length && filteredImages.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-input"
                        />
                      </TableHead>
                      <TableHead>Thumbnail</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="hidden md:table-cell">Tags</TableHead>
                      <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
                      <TableHead className="w-48">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredImages.map((image, index) => (
                      <TableRow key={image.id} className={cn('hover:bg-muted/50', selectedImages.includes(image.id) && 'bg-primary/5')}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedImages.includes(image.id)}
                            onChange={() => toggleImageSelect(image.id)}
                            className="rounded border-input"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="h-16 w-16 rounded overflow-hidden relative">
                            <Image
                              src={image.thumbnailUrl}
                              alt={image.filename}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium truncate max-w-[200px]">{image.filename}</p>
                            {image.caption && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">{image.caption}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{image.width} × {image.height}</TableCell>
                        <TableCell className="text-sm">{(image.size / 1024 / 1024).toFixed(1)} MB</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {image.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {image.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{image.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {format(new Date(image.uploadedAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleImageClick(index)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Full Size
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Metadata
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setGallery((prev) => ({
                                    ...prev,
                                    images: prev.images.map((img) =>
                                      img.id === image.id ? { ...img, isFavorite: !img.isFavorite } : img
                                    ),
                                  }))
                                }}
                              >
                                {image.isFavorite ? (
                                  <>
                                    <Heart className="mr-2 h-4 w-4 text-red-500 fill-red-500" />
                                    Remove from Favorites
                                  </>
                                ) : (
                                  <>
                                    <Heart className="mr-2 h-4 w-4" />
                                    Add to Favorites
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleAddToAlbum('')}>
                                <Square className="mr-2 h-4 w-4" />
                                Add to Album
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setGallery((prev) => ({
                                    ...prev,
                                    images: prev.images.filter((img) => img.id !== image.id),
                                  }))
                                }}
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
              </div>
            )}

            {viewMode === 'masonry' && (
              <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3">
                {filteredImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={cn(
                        'relative break-inside-avoid mb-3 rounded-lg overflow-hidden cursor-pointer transition-all',
                        selectedImages.includes(image.id) &&
                          'ring-2 ring-primary ring-offset-2'
                      )}
                    onClick={() => handleImageClick(index)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      toggleImageSelect(image.id)
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedImages.includes(image.id)}
                      onChange={() => toggleImageSelect(image.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 left-2 z-10 rounded border-input bg-white/90"
                    />
                    <Image
                      src={image.thumbnailUrl}
                      alt={image.caption || image.filename}
                      width={400}
                      height={Math.round((400 / image.width) * image.height)}
                      className="w-full h-auto object-cover transition-transform duration-300 hover:scale-[1.02]"
                    />
                    {image.isFavorite && (
                      <div className="absolute bottom-2 left-2">
                        <Heart className="h-5 w-5 text-red-500 fill-red-500 drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Albums Tab */}
        <TabsContent value="albums" className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading font-semibold">Albums</h2>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Album
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {gallery.albums.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Square className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No albums yet</p>
                <Button className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Album
                </Button>
              </div>
            ) : (
              gallery.albums.map((album) => (
                <Card key={album.id} className="card-hover">
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {album.coverImageId ? (
                      <Image
                        src={gallery.images.find((i) => i.id === album.coverImageId)?.thumbnailUrl || ''}
                        alt={album.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Square className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-white font-medium truncate">{album.name}</p>
                      <p className="text-white/70 text-sm">{album.imageCount} images</p>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{album.name}</h3>
                        {album.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{album.description}</p>
                        )}
                      </div>
                      <Badge variant={album.isPublic ? 'default' : 'outline'}>
                        {album.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <Button variant="ghost" size="sm" className="flex-1">
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1">
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="flex-1">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 overflow-auto">
          <div className="space-y-6 max-w-3xl">
            <div className="space-y-4">
              <h3 className="text-heading font-semibold">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Gallery Name</Label>
                  <Input defaultValue={gallery.name} />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input defaultValue={gallery.slug} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea defaultValue={gallery.description || ''} rows={3} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-heading font-semibold">Gallery Settings</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select defaultValue={gallery.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select defaultValue={gallery.type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="store">Store</SelectItem>
                      <SelectItem value="proofing">Proofing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select defaultValue={gallery.visibility}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="unlisted">Unlisted</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="password">Password Protected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {gallery.visibility === 'password' && (
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Enter password" />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-heading font-semibold">Display Options</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select defaultValue={gallery.settings.theme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="masonry">Masonry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <Input type="color" defaultValue={gallery.settings.primaryColor} />
                </div>
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select defaultValue={gallery.sortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Order</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="favorites">Favorites</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch defaultChecked={gallery.downloadEnabled} />
                  <Label>Enable Downloads</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked={gallery.watermarkEnabled} />
                  <Label>Watermark Images</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked={gallery.allowFavorites} />
                  <Label>Allow Favorites</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked={gallery.allowComments} />
                  <Label>Allow Comments</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked={gallery.requireEmail} />
                  <Label>Require Email</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-heading font-semibold">Expiration</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch />
                  <Label>Set Expiration Date</Label>
                </div>
                <Input type="date" className="w-[200px]" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline">Cancel</Button>
              <Button>Save Changes</Button>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="flex-1 overflow-auto">
          <div className="space-y-6 max-w-4xl">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Views</p>
                      <p className="text-3xl font-bold">{gallery.stats.views.toLocaleString()}</p>
                    </div>
                    <Eye className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Downloads</p>
                      <p className="text-3xl font-bold">{gallery.stats.downloads.toLocaleString()}</p>
                    </div>
                    <Download className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Favorites</p>
                      <p className="text-3xl font-bold">{gallery.stats.favorites.toLocaleString()}</p>
                    </div>
                    <Heart className="h-8 w-8 text-red-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Shares</p>
                      <p className="text-3xl font-bold">{gallery.stats.shares.toLocaleString()}</p>
                    </div>
                    <Share2 className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Views Over Time</CardTitle>
                <CardDescription>Gallery view statistics for the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-primary/20 rounded-t transition-all hover:bg-primary"
                      style={{ height: `${Math.random() * 80 + 20}%` }}
                      title={`Day ${i + 1}: ${Math.floor(Math.random() * 100)} views`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Images</CardTitle>
                <CardDescription>Most viewed and favorited images</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Favorites</TableHead>
                      <TableHead>Downloads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gallery.images.slice(0, 5).map((image) => (
                      <TableRow key={image.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded overflow-hidden">
                              <Image
                                src={image.thumbnailUrl}
                                alt={image.filename}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{image.filename}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{Math.floor(Math.random() * 500)}</TableCell>
                        <TableCell>{image.isFavorite ? Math.floor(Math.random() * 50) : 0}</TableCell>
                        <TableCell>{Math.floor(Math.random() * 20)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>Where your gallery visitors are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { source: 'Direct Link', visits: 542, percentage: 43 },
                    { source: 'Email', visits: 312, percentage: 25 },
                    { source: 'Social Media', visits: 187, percentage: 15 },
                    { source: 'Search', visits: 124, percentage: 10 },
                    { source: 'Referral', visits: 82, percentage: 7 },
                  ].map((item) => (
                    <div key={item.source} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.source}</span>
                        <span className="font-medium">{item.visits} ({item.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

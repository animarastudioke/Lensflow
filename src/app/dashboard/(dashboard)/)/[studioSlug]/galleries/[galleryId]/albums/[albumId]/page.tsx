'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Image,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Delete,
  Share2,
  Download,
  Settings,
  Upload,
  Trash2,
  Copy,
  Heart,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Grid,
  List,
  ArrowLeft,
  Globe,
  Lock,
  Calendar,
  Users,
  Tag,
  palette,
} from 'lucide-react'
import { format } from 'date-fns'

interface MediaItem {
  id: string
  filename: string
  url: string
  thumbnailUrl: string
  type: 'image' | 'video'
  size: number
  width: number
  height: number
  metadata?: {
    camera?: string
    lens?: string
    iso?: number
    aperture?: string
    shutterSpeed?: string
    focalLength?: string
    gps?: { lat: number; lng: number }
    tags?: string[]
  }
  isFavorite: boolean
  commentCount: number
  createdAt: string
  albumId?: string
}

interface AlbumData {
  id: string
  name: string
  description?: string
  coverImage?: string
  mediaCount: number
  order: number
  createdAt: string
}

const mockMedia: MediaItem[] = Array.from({ length: 24 }, (_, i) => ({
  id: `${i + 1}`,
  filename: `IMG_${String(i + 1).padStart(4, '0')}.jpg`,
  url: `https://images.unsplash.com/photo-${1500000000000 + i * 10000}?w=1920`,
  thumbnailUrl: `https://images.unsplash.com/photo-${1500000000000 + i * 10000}?w=400`,
  type: 'image',
  size: 5000000 + i * 100000,
  width: 4000,
  height: 3000,
  metadata: {
    camera: 'Canon R5',
    lens: 'RF 85mm f/1.2L',
    iso: 100,
    aperture: 'f/1.8',
    shutterSpeed: '1/200',
    focalLength: '85mm',
    tags: ['wedding', 'ceremony', 'portrait'].slice(0, Math.floor(Math.random() * 3) + 1),
  },
  isFavorite: i % 7 === 0,
  commentCount: Math.floor(Math.random() * 5),
  createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  albumId: i < 8 ? '1' : i < 16 ? '2' : '3',
}))

const mockAlbum: AlbumData = {
  id: '1',
  name: 'Ceremony',
  description: 'Wedding ceremony photos',
  coverImage: mockMedia[0].thumbnailUrl,
  mediaCount: 8,
  order: 1,
  createdAt: '2024-06-15',
}

const albumMedia = mockMedia.filter(m => m.albumId === '1')

interface AlbumDetailProps {
  studioSlug: string
  galleryId: string
  albumId: string
  album?: AlbumData
  gallery?: {
    id: string
    name: string
    type: string
  }
}

export default function AlbumDetailPage({ params }: { params: Promise<{ studioSlug: string; galleryId: string; albumId: string }> }) {
  const [studioSlug, setStudioSlug] = React.useState('')
  const [galleryId, setGalleryId] = React.useState('')
  const [albumId, setAlbumId] = React.useState('')
  const [viewMode, setViewMode] = React.useState<'grid' | 'masonry'>('grid')
  const [selectedMedia, setSelectedMedia] = React.useState<string[]>([])

  React.useEffect(() => {
    params.then(p => {
      setStudioSlug(p.studioSlug)
      setGalleryId(p.galleryId)
      setAlbumId(p.albumId)
    })
  }, [params])

  const album = mockAlbum
  const media = albumMedia

  const toggleSelect = (id: string) => {
    setSelectedMedia(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href={`/dashboard/${studioSlug}/galleries/${galleryId}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Gallery
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-display-md font-display font-bold tracking-tight">{album.name}</h1>
              <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                Album
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Image className="h-3.5 w-3.5" />
                {album.mediaCount} photos
              </span>
              <span>Created {format(new Date(album.createdAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4 mr-2" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{album.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Album
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Album
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Media Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {selectedMedia.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg text-primary text-sm font-medium">
            {selectedMedia.length} selected
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMedia([])}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search..."
              className="h-10 w-64 pl-10 pr-4 rounded-lg border border-input bg-background text-sm"
            />
          </div>

          <div className="flex bg-muted rounded-lg p-1" role="group" aria-label="View mode">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'masonry' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('masonry')}
              aria-label="Masonry view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedMedia.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-medium text-muted-foreground">{selectedMedia.length} selected</span>
          <Button variant="outline" size="sm">Move to Album</Button>
          <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" />Download</Button>
          <Button variant="destructive" size="sm"><Trash2 className="h-3.5 w-3.5 mr-1" />Remove</Button>
        </div>
      )}

      {/* Media Grid */}
      <div className={cn(
        'grid gap-3',
        viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      )}>
        {media.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Image className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-heading text-muted-foreground">No photos in this album</h3>
            <p className="text-body-sm text-muted-foreground mt-1">Add photos to get started</p>
            <Button className="mt-4"><Plus className="h-4 w-4 mr-2" />Add Photos</Button>
          </div>
        ) : (
          media.map(item => (
            <div
              key={item.id}
              className={cn(
                'relative group overflow-hidden rounded-xl bg-muted transition-all duration-200',
                selectedMedia.includes(item.id) && 'ring-2 ring-primary ring-offset-2 bg-primary/5'
              )}
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={item.thumbnailUrl}
                  alt={item.filename}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="checkbox"
                    checked={selectedMedia.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="h-5 w-5 rounded border-2 border-white text-primary bg-white"
                    aria-label={`Select ${item.filename}`}
                  />
                </div>
                {item.isFavorite && (
                  <div className="absolute top-1 right-1">
                    <Heart className="h-5 w-5 text-red-500 fill-current drop-shadow" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate" title={item.filename}>{item.filename}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(item.createdAt), 'MMM d')} • {(item.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
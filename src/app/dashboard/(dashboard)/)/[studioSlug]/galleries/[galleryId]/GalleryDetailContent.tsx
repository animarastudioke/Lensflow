'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  QrCode,
  Link as LinkIcon,
  Check,
} from 'lucide-react'
import { format } from 'date-fns'
import { useMediaGrid } from './useMediaGrid'

// Database types (snake_case)
interface DbMediaItem {
  id: string
  filename: string
  url: string
  thumbnail_url: string
  type: 'image' | 'video'
  size: number
  width: number
  height: number
  metadata?: {
    camera?: string
    lens?: string
    iso?: number
    aperture?: string
    shutter_speed?: string
    focal_length?: string
    gps?: { lat: number; lng: number }
    tags?: string[]
  }
  is_favorite: boolean
  comment_count: number
  created_at: string
  album_id?: string
}

interface DbAlbum {
  id: string
  name: string
  description?: string
  cover_image?: string
  media_count: number
  order: number
  created_at: string
}

interface DbGallery {
  id: string
  studio_id: string
  name: string
  description?: string
  type: 'wedding' | 'portrait' | 'commercial' | 'event' | 'other'
  shoot_date?: string
  client_id?: string
  status: 'draft' | 'published' | 'archived' | 'private'
  password_protected: boolean
  allow_download: boolean
  allow_comments: boolean
  allow_favorites: boolean
  watermark_enabled: boolean
  expiry_days?: number
  seo_title?: string
  seo_description?: string
  custom_domain?: string
  share_token: string
  cover_image?: string
  media_count: number
  view_count: number
  download_count: number
  created_at: string
  updated_at: string
  client?: { id: string; name: string; email: string }
  share_settings?: {
    link_name?: string
    password_protected: boolean
    expires_at?: string
    allow_download: boolean
    allow_comments: boolean
    allow_favorites: boolean
    require_email: boolean
    collect_email: boolean
    custom_branding: boolean
    brand_name?: string
    brand_logo?: string
    brand_color?: string
    cover_image?: string
    notify_on_view: boolean
    notify_on_download: boolean
    notify_on_favorite: boolean
    notify_on_comment: boolean
    allow_embed: boolean
    embed_width: number
    embed_height: number
  }
  albums?: DbAlbum[]
  media?: DbMediaItem[]
}

// Transform database types to UI types
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

interface Album {
  id: string
  name: string
  description?: string
  coverImage?: string
  mediaCount: number
  order: number
  createdAt: string
}

function transformMedia(dbMedia: DbMediaItem[]): MediaItem[] {
  return dbMedia.map(m => ({
    id: m.id,
    filename: m.filename,
    url: m.url,
    thumbnailUrl: m.thumbnail_url,
    type: m.type,
    size: m.size,
    width: m.width,
    height: m.height,
    metadata: m.metadata ? {
      ...m.metadata,
      shutterSpeed: m.metadata.shutter_speed,
      focalLength: m.metadata.focal_length,
    } : undefined,
    isFavorite: m.is_favorite,
    commentCount: m.comment_count,
    createdAt: m.created_at,
    albumId: m.album_id,
  }))
}

function transformAlbums(dbAlbums: DbAlbum[]): Album[] {
  return dbAlbums.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    coverImage: a.cover_image,
    mediaCount: a.media_count,
    order: a.order,
    createdAt: a.created_at,
  }))
}

interface GalleryDetailContentProps {
  studioSlug: string
  galleryId: string
  gallery: DbGallery
}

export function GalleryDetailContent({ studioSlug, galleryId, gallery }: GalleryDetailContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = React.useState<'media' | 'albums' | 'settings' | 'analytics' | 'share'>('media')
  const [viewMode, setViewMode] = React.useState<'grid' | 'masonry'>('grid')
  const [selectedMedia, setSelectedMedia] = React.useState<string[]>([])
  const [showUpload, setShowUpload] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [albumDeleteConfirm, setAlbumDeleteConfirm] = React.useState<string | null>(null)
  const [showAlbumForm, setShowAlbumForm] = React.useState(false)
  const [editingAlbum, setEditingAlbum] = React.useState<Album | null>(null)

  // Transform data from database format
  const media = React.useMemo(() => transformMedia(gallery.media || []), [gallery.media])
  const albums = React.useMemo(() => transformAlbums(gallery.albums || []), [gallery.albums])

  const { filteredMedia, searchQuery, setSearchQuery, albumFilter, setAlbumFilter, sortBy, setSortBy } = useMediaGrid({
    media,
    albums,
  })

  const handleDeleteMedia = (ids: string[]) => {
    // In real app, call deleteMedia server action
    console.log('Deleting media:', ids)
  }

  const handleDeleteAlbum = (id: string) => {
    // In real app, call deleteAlbum server action
    console.log('Deleting album:', id)
  }

  const toggleMediaSelect = (id: string) => {
    setSelectedMedia(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedMedia.length === filteredMedia.length) {
      setSelectedMedia([])
    } else {
      setSelectedMedia(filteredMedia.map(m => m.id))
    }
  }

  // Extract client name from gallery
  const clientName = gallery.client?.name
  const clientId = gallery.client?.id
  const shareSettings = gallery.share_settings

  return (
    <div className="space-y-6">
      {/* Gallery Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href={`/dashboard/${studioSlug}/galleries`}
            className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Galleries
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-display-md font-display font-bold tracking-tight">{gallery.name}</h1>
              <span className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                gallery.status === 'published' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                gallery.status === 'draft' && 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
                gallery.status === 'archived' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                gallery.status === 'private' && 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
              )}>
                {gallery.status}
              </span>
              {gallery.password_protected && (
                <Lock className="h-4 w-4 text-muted-foreground" title="Password protected" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              {clientName && clientId && (
                <Link href={`/dashboard/${studioSlug}/clients/${clientId}`} className="hover:underline flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {clientName}
                </Link>
              )}
              {gallery.shoot_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(gallery.shoot_date), 'MMM d, yyyy')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Image className="h-3.5 w-3.5" />
                {gallery.media_count} photos
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {gallery.view_count.toLocaleString()} views
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Share Gallery</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/g/${mockGallery.shareToken}`} target="_blank">
                  <Globe className="mr-2 h-4 w-4" />
                  Open Client View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Copy Share Link
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Share Settings
              </DropdownMenuItem>
            </DropdownMenuContent          </DropdownMenu>

          <Link href={`/dashboard/${studioSlug}/galleries/${galleryId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="media">
            <Image className="h-4 w-4 mr-2" />
            Media ({media.length})
          </TabsTrigger>
          <TabsTrigger value="albums">
            <Grid className="h-4 w-4 mr-2" />
            Albums ({albums.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Users className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="share">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </TabsTrigger>
        </TabsList>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-4">
          {/* Media Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              {selectedMedia.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg text-primary text-sm font-medium">
                  {selectedMedia.length} selected
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMedia([])}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-10 w-64 pl-10 pr-4"
                />
              </div>

              <Select value={albumFilter} onValueChange={setAlbumFilter}>
                <SelectTrigger className="h-10 w-36">
                  <SelectValue placeholder="All Albums" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Albums</SelectItem>
                  {albums.map(album => (
                    <SelectItem key={album.id} value={album.id}>{album.name}</SelectItem>
                  ))}
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-36">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date Added</SelectItem>
                  <SelectItem value="filename">Filename</SelectItem>
                  <SelectItem value="size">File Size</SelectItem>
                </SelectContent>
              </Select>

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
              <Button variant="outline" size="sm" onClick={() => {}}>Add to Album</Button>
              <Button variant="outline" size="sm" onClick={() => {}}>Move to Album</Button>
              <Button variant="outline" size="sm" onClick={() => {}}><Download className="h-3.5 w-3.5 mr-1" />Download</Button>
              <Button variant="destructive" size="sm" onClick={() => handleDeleteMedia(selectedMedia)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
              </Button>
            </div>
          )}

          {/* Media Grid */}
          <div className={cn(
            'grid gap-3',
            viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          )}>
            {filteredMedia.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Image className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-heading text-muted-foreground">No media found</h3>
                <p className="text-body-sm text-muted-foreground mt-1">
                  {searchQuery || albumFilter ? 'Try adjusting your filters or search query' : 'Upload photos to get started'}
                </p>
                {(!searchQuery && !albumFilter) && (
                  <Button onClick={() => setShowUpload(true)} className="mt-4">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photos
                  </Button>
                )}
              </div>
            ) : (
              filteredMedia.map(item => (
                <MediaCard
                  key={item.id}
                  item={item}
                  studioSlug={studioSlug}
                  galleryId={galleryId}
                  selected={selectedMedia.includes(item.id)}
                  onSelect={toggleMediaSelect}
                  viewMode={viewMode}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Albums Tab */}
        <TabsContent value="albums" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading font-semibold">Albums</h2>
            <Button onClick={() => { setEditingAlbum(null); setShowAlbumForm(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Album
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {albums.map(album => (
              <AlbumCard
                key={album.id}
                album={album}
                studioSlug={studioSlug}
                galleryId={galleryId}
                onEdit={setEditingAlbum}
                onDelete={setAlbumDeleteConfirm}
              />
            ))}

            {/* Create Album Card */}
            <Card className="border-dashed border-2 border-border/50 hover:border-primary/50 transition-colors" onClick={() => { setEditingAlbum(null); setShowAlbumForm(true) }}>
              <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Plus className="h-10 w-10 mb-2" />
                <span className="font-medium">Create Album</span>
                <p className="text-sm">Click to create a new album</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <GallerySettingsForm gallery={gallery} studioSlug={studioSlug} galleryId={galleryId} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <GalleryAnalytics gallery={gallery} />
        </TabsContent>

        {/* Share Tab */}
        <TabsContent value="share" className="space-y-6">
          <ShareTabContent gallery={gallery} studioSlug={studioSlug} galleryId={galleryId} />
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Photos</DialogTitle>
            <DialogDescription>
              Drag and drop photos here, or click to select files. Maximum 500MB per file.
            </DialogDescription>
          </DialogHeader>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-body">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">Supports: JPG, PNG, RAW, MP4, MOV (max 500MB each)</p>
            <Button className="mt-4" onClick={() => {}}>Select Files</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={() => { setShowUpload(false); toast.success('Upload started') }}>Start Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Album Form Dialog */}
      <Dialog open={showAlbumForm} onOpenChange={setShowAlbumForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAlbum ? 'Edit Album' : 'Create Album'}</DialogTitle>
            <DialogDescription>{editingAlbum ? 'Update album details' : 'Create a new album to organize your photos'}</DialogDescription>
          </DialogHeader>
          <AlbumForm
            album={editingAlbum}
            onSubmit={(data) => {
              console.log('Save album:', data)
              setShowAlbumForm(false)
              setEditingAlbum(null)
            }}
            onCancel={() => { setShowAlbumForm(false); setEditingAlbum(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Media Confirmation */}
      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={setDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Media</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedMedia.length} item(s)? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { handleDeleteMedia(selectedMedia); setDeleteConfirm(null); setSelectedMedia([]); }}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Album Confirmation */}
      {albumDeleteConfirm && (
        <Dialog open={!!albumDeleteConfirm} onOpenChange={setAlbumDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Album</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this album? Photos in this album will be moved to "Unassigned".
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAlbumDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { handleDeleteAlbum(albumDeleteConfirm); setAlbumDeleteConfirm(null); }}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Media Detail Dialog - would open on click */}
    </div>
  )
}

interface MediaCardProps {
  item: MediaItem
  studioSlug: string
  galleryId: string
  selected: boolean
  onSelect: (id: string) => void
  viewMode: 'grid' | 'masonry'
}

function MediaCard({ item, studioSlug, galleryId, selected, onSelect, viewMode }: MediaCardProps) {
  const aspectRatio = item.width / item.height

  return (
    <Card
      className={cn(
        'relative group overflow-hidden transition-all duration-200',
        selected && 'ring-2 ring-primary ring-offset-2 bg-primary/5'
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted" style={{ aspectRatio: viewMode === 'grid' ? '1 / 1' : undefined }}>
        <img
          src={item.thumbnailUrl}
          alt={item.filename}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Selection overlay */}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(item.id)}
            className="h-5 w-5 rounded border-2 border-white text-primary bg-white focus:ring-2 focus:ring-primary"
            aria-label={`Select ${item.filename}`}
          />
        </div>

        {/* Favorite indicator */}
        {item.isFavorite && (
          <div className="absolute top-1 right-1">
            <Heart className="h-5 w-5 text-red-500 fill-current drop-shadow" />
          </div>
        )}

        {/* Video indicator */}
        {item.type === 'video' && (
          <div className="absolute bottom-1 right-1 bg-black/50 text-white px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Video
          </div>
        )}

        {/* Comment count */}
        {item.commentCount > 0 && (
          <div className="absolute bottom-1 left-1 bg-black/50 text-white px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {item.commentCount}
          </div>
        )}
      </div>

      <CardContent className="p-2">
        <p className="text-xs font-medium truncate" title={item.filename}>
          {item.filename}
        </p>
        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
          <span>{format(new Date(item.createdAt), 'MMM d')}</span>
          <span>{(item.size / 1024 / 1024).toFixed(1)} MB</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface AlbumCardProps {
  album: Album
  studioSlug: string
  galleryId: string
  onEdit: (album: Album) => void
  onDelete: (id: string) => void
}

function AlbumCard({ album, studioSlug, galleryId, onEdit, onDelete }: AlbumCardProps) {
  const aspectRatio = 16 / 9

  return (
    <Card className="group overflow-hidden">
      <Link href={`/dashboard/${studioSlug}/galleries/${galleryId}/albums/${album.id}`}>
        <div className="relative aspect-video overflow-hidden bg-muted">
          {album.coverImage ? (
            <img
              src={album.coverImage}
              alt={album.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground/50">
              <Grid className="h-10 w-10" />
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
            <h3 className="font-medium text-white truncate">{album.name}</h3>
            <p className="text-xs text-white/80">{album.mediaCount} photos</p>
          </div>
        </div>
      </Link>

      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{album.name}</p>
            <p className="text-sm text-muted-foreground">{album.mediaCount} photos</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(album)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(album.id)}>
              <Delete className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AlbumForm({ album, onSubmit, onCancel }: { album: Album | null; onSubmit: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = React.useState(album?.name || '')
  const [description, setDescription] = React.useState(album?.description || '')

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ name, description }) }} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Album Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Ceremony, Reception, Portraits"
          className="w-full h-10 px-4 rounded-lg border border-input bg-background text-sm"
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description for this album"
          rows={3}
          className="w-full h-24 px-4 py-2 rounded-lg border border-input bg-background text-sm resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{album ? 'Save Changes' : 'Create Album'}</Button>
      </div>
    </form>
  )
}

function GallerySettingsForm({ gallery, studioSlug, galleryId }: { gallery: DbGallery; studioSlug: string; galleryId: string }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic gallery information and display options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Gallery Name</label>
            <input defaultValue={gallery.name} className="w-full h-10 px-4 rounded-lg border border-input bg-background" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea defaultValue={gallery.description || ''} rows={3} className="w-full px-4 py-2 rounded-lg border border-input bg-background" />
          </div>
          <Button>Save Changes</Button>
        </CardContent      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Control</CardTitle>
          <CardDescription>Manage who can view and interact with this gallery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password Protection</p>
              <p className="text-sm text-muted-foreground">Require password to view gallery</p>
            </div>
            <input type="checkbox" defaultChecked={gallery.password_protected} className="h-4 w-4 rounded border-gray-300 text-primary" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Allow Downloads</p>
              <p className="text-sm text-muted-foreground">Clients can download photos</p>
            </div>
            <input type="checkbox" defaultChecked={gallery.allow_download} className="h-4 w-4 rounded border-gray-300 text-primary" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Allow Comments</p>
              <p className="text-sm text-muted-foreground">Clients can leave comments</p>
            </div>
            <input type="checkbox" defaultChecked={gallery.allow_comments} className="h-4 w-4 rounded border-gray-300 text-primary" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Allow Favorites</p>
              <p className="text-sm text-muted-foreground">Clients can mark favorites</p>
            </div>
            <input type="checkbox" defaultChecked={gallery.allow_favorites} className="h-4 w-4 rounded border-gray-300 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced</CardTitle>
          <CardDescription>Watermarking, SEO, and custom domain settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Watermark</p>
              <p className="text-sm text-muted-foreground">Apply watermark to all images</p>
            </div>
            <input type="checkbox" defaultChecked={gallery.watermark_enabled} className="h-4 w-4 rounded border-gray-300 text-primary" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Domain</label>
            <input defaultValue={gallery.custom_domain || ''} placeholder="gallery.yourdomain.com" className="w-full h-10 px-4 rounded-lg border border-input bg-background" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function GalleryAnalytics({ gallery }: { gallery: DbGallery }) {
  const stats = [
    { label: 'Total Views', value: gallery.view_count.toLocaleString(), change: '+12%', trend: 'up' },
    { label: 'Unique Visitors', value: '892', change: '+8%', trend: 'up' },
    { label: 'Downloads', value: gallery.download_count.toLocaleString(), change: '+5%', trend: 'up' },
    { label: 'Avg. Session', value: '4m 32s', change: '-2%', trend: 'down' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <p className="text-body-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-display-sm font-display font-bold">{stat.value}</p>
              <p className={cn('mt-2 text-body-sm font-medium', stat.trend === 'up' ? 'text-success' : 'text-destructive')}>
                {stat.change} vs last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-center gap-2">
              {[10, 25, 15, 40, 30, 55, 45, 60, 50, 70, 65, 80].map((v, i) => (
                <div key={i} className="flex-1 max-w-12 bg-primary/20 rounded-t transition-all hover:bg-primary" style={{ height: `${v}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Direct', 'Email', 'Google', 'Instagram', 'Facebook'].map((ref, i) => (
                <div key={ref} className="flex items-center justify-between">
                  <span className="font-medium">{ref}</span>
                  <span className="text-muted-foreground">{(100 - i * 15)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
}

function ShareTabContent({
  gallery,
  studioSlug,
  galleryId
}: {
  gallery: DbGallery;
  studioSlug: string;
  galleryId: string;
}) {
  const shareToken = gallery.share_token
  const shareUrl = shareToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/g/${shareToken}` : '';
  const [copied, setCopied] = React.useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy link')
    }
  }

  const shareSettings = gallery.share_settings

  return (
    <div className="max-w-4xl space-y-6">
      {/* Share Link Card */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-display-sm flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Link
          </CardTitle>
          <CardDescription>Share this gallery with your clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-medium">Gallery Link</Label>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyLink}
                disabled={copied}
                aria-label={copied ? 'Copied' : 'Copy link'}
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="flex-1 bg-background" />
              <label className="flex items-center gap-1 text-sm text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                Public
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              {gallery.password_protected && (
                <span className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Password protected
                </span>
              )}
              {shareSettings?.expires_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Expires {new Date(shareSettings.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/g/${shareToken}`} target="_blank">
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View Gallery
              </Button>
            </Link>
            <Link href={`/dashboard/${studioSlug}/galleries/${galleryId}/share`}>
              <Button variant="default">
                <Settings className="h-4 w-4 mr-2" />
                Share Settings
              </Button>
            </Link>
            <Link href={`/dashboard/${studioSlug}/galleries/${galleryId}/share`}>
              <Button variant="outline">
                <QrCode className="h-4 w-4 mr-2" />
                Get QR Code
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Access Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Access Settings
          </CardTitle>
          <CardDescription>Current client permissions for this gallery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Downloads</p>
              <p className={`font-medium text-2xl ${gallery.allow_download ? 'text-success' : 'text-destructive'}`}>
                {gallery.allow_download ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Comments</p>
              <p className={`font-medium text-2xl ${gallery.allow_comments ? 'text-success' : 'text-destructive'}`}>
                {gallery.allow_comments ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Favorites</p>
              <p className={`font-medium text-2xl ${gallery.allow_favorites ? 'text-success' : 'text-destructive'}`}>
                {gallery.allow_favorites ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Watermark</p>
              <p className={`font-medium text-2xl ${gallery.watermark_enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                {gallery.watermark_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href={`/dashboard/${studioSlug}/galleries/${galleryId}/share`}>
            <Button variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copy Share Link
            </Button>
          </Link>
          <Link href={`/dashboard/${studioSlug}/galleries/${galleryId}/share`}>
            <Button variant="outline">
              <QrCode className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </Link>
          <Link href={`/dashboard/${studioSlug}/galleries/${galleryId}/share`}>
            <Button variant="outline">
              <Globe className="h-4 w-4 mr-2" />
              Get Embed Code
            </Button>
          </Link>
          <Link href={`/dashboard/${studioSlug}/galleries/${galleryId}/share`}>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Email to Client
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

// Mock toast for demo
const toast = {
  success: (msg: string) => console.log('Success:', msg),
  error: (msg: string) => console.log('Error:', msg),
}
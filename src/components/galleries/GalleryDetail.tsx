'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  createAlbum,
  updateAlbum,
  deleteAlbum,
  duplicateAlbum,
  assignMediaToAlbum,
  setMediaFavorite,
  deleteMedia,
  updateGalleryStatus,
  updateGallery,
} from '@/lib/actions/galleries'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  MoreVertical,
  Trash2,
  Edit,
  Share2,
  Palette,
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
  Eye,
  Square,
  Settings,
  BarChart3,
  ArrowUpDown,
  Copy,
  Loader2,
  FolderOpen,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
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
import { StatusBadge } from '@/components/layout/StatusBadge'
import Image from 'next/image'

interface GalleryImage {
  id: string
  filename: string
  url: string
  thumbnailUrl: string
  width: number
  height: number
  size: number
  mimeType: 'image' | 'video'
  videoPlaybackUrl?: string
  isFavorite: boolean
  albumId?: string
  sortOrder: number
  uploadedAt: string
}

interface GalleryAlbum {
  id: string
  name: string
  description?: string
  coverImageUrl?: string
  imageCount: number
  sortOrder: number
  createdAt: string
}

export interface Gallery {
  id: string
  name: string
  description?: string
  status: 'draft' | 'published' | 'archived' | 'private'
  type: 'wedding' | 'portrait' | 'commercial' | 'event' | 'other'
  passwordProtected: boolean
  expiryDays?: number
  downloadEnabled: boolean
  watermarkEnabled: boolean
  allowFavorites: boolean
  allowComments: boolean
  requireEmail: boolean
  images: GalleryImage[]
  albums: GalleryAlbum[]
  clientId?: string
  clientName?: string
  clientEmail?: string
  shootDate?: string
  shareToken: string
  settings: {
    primaryColor: string
    logoUrl?: string
  }
  stats: {
    views: number
    downloads: number
    favorites: number
  }
  createdAt: string
  updatedAt: string
}

// Type is a category label, not a status -- rendered as a neutral outline
// badge (token-based, dark-mode-safe) rather than the semantic
// success/warning/destructive palette StatusBadge uses for gallery.status.
const GALLERY_TYPE_LABEL: Record<Gallery['type'], string> = {
  wedding: 'Wedding',
  portrait: 'Portrait',
  commercial: 'Commercial',
  event: 'Event',
  other: 'Other',
}

interface GalleryDetailProps {
  studioSlug: string
  initialGallery: Gallery
}

export function GalleryDetail({ studioSlug, initialGallery }: GalleryDetailProps) {
  const router = useRouter()

  const [gallery, setGallery] = React.useState<Gallery>(initialGallery)
  const [activeTab, setActiveTab] = React.useState<'images' | 'albums' | 'settings' | 'analytics'>('images')
  const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'masonry'>('grid')
  const [selectedImages, setSelectedImages] = React.useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<'custom' | 'date' | 'name' | 'favorites'>('custom')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [lightboxZoom, setLightboxZoom] = React.useState(1)
  const [lightboxRotation, setLightboxRotation] = React.useState(0)
  const [albumFilter, setAlbumFilter] = React.useState<string | null>(null)

  const [albumDialogOpen, setAlbumDialogOpen] = React.useState(false)
  const [albumDialogTarget, setAlbumDialogTarget] = React.useState<GalleryAlbum | null>(null)
  const [albumName, setAlbumName] = React.useState('')
  const [albumDescription, setAlbumDescription] = React.useState('')
  const [albumSubmitting, setAlbumSubmitting] = React.useState(false)
  const [albumDeleteConfirm, setAlbumDeleteConfirm] = React.useState<GalleryAlbum | null>(null)
  const [addToAlbumOpen, setAddToAlbumOpen] = React.useState(false)
  const [addToAlbumTargetIds, setAddToAlbumTargetIds] = React.useState<string[]>([])

  // Settings tab -- form state for the fields updateGallery() actually
  // persists. "Primary Color" and "Require Email" were removed from this
  // tab: they belong to gallery_share_settings (updateShareSettings), a
  // separate action with its own required fields (link_name, notify/embed
  // settings) -- submitting this simpler form through it would silently
  // reset those unrelated settings to their zod defaults. Fixing that
  // requires either extending updateGallery or building a dedicated
  // share-settings surface, both out of scope for this pass; primary
  // color is already editable on the gallery's Design page.
  //
  // allowComments/watermarkEnabled are kept here only so a save resubmits
  // whatever they were already set to -- both persist to a real column via
  // updateGallery, but neither has a consumer anywhere on the client-facing
  // gallery (no commenting UI exists at all; the upload pipeline never
  // composites a watermark), so no toggle for them is rendered below. A
  // control that saves but does nothing is worse than no control.
  const initialSettingsForm = React.useCallback(
    (g: Gallery) => ({
      name: g.name,
      description: g.description ?? '',
      type: g.type,
      passwordProtected: g.passwordProtected,
      password: '',
      downloadEnabled: g.downloadEnabled,
      watermarkEnabled: g.watermarkEnabled,
      allowFavorites: g.allowFavorites,
      allowComments: g.allowComments,
      expiryEnabled: g.expiryDays != null,
      expiryDays: g.expiryDays ?? 30,
    }),
    []
  )
  const [settingsForm, setSettingsForm] = React.useState(() => initialSettingsForm(gallery))
  const [isSavingSettings, setIsSavingSettings] = React.useState(false)
  const [settingsError, setSettingsError] = React.useState<string | null>(null)

  // Filter and sort images
  const filteredImages = React.useMemo(() => {
    let result = [...gallery.images]

    if (albumFilter) {
      result = result.filter((img) => img.albumId === albumFilter)
    }

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
  }, [gallery.images, sortBy, sortOrder, albumFilter])

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index)
    setIsLightboxOpen(true)
    setLightboxZoom(1)
    setLightboxRotation(0)
  }

  // Grid/masonry tiles were previously plain <div onClick> -- unreachable by
  // keyboard at all (the "list" view's equivalent action is already
  // reachable via its DropdownMenu's "View Full Size" item). Each tile
  // below is now a real tab stop (role="button"/tabIndex=0) wired to this
  // handler so Enter/Space open the lightbox exactly like a click would,
  // matching the pattern already fixed on the public gallery in Step 13.
  const handleImageTileKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleImageClick(index)
    }
  }

  const closeLightbox = () => setIsLightboxOpen(false)

  const showPrevImage = React.useCallback(() => {
    setCurrentImageIndex((prev) => (prev === 0 ? filteredImages.length - 1 : prev - 1))
    setLightboxZoom(1)
    setLightboxRotation(0)
  }, [filteredImages.length])

  const showNextImage = React.useCallback(() => {
    setCurrentImageIndex((prev) => (prev === filteredImages.length - 1 ? 0 : prev + 1))
    setLightboxZoom(1)
    setLightboxRotation(0)
  }, [filteredImages.length])

  React.useEffect(() => {
    if (!isLightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowLeft') showPrevImage()
      else if (e.key === 'ArrowRight') showNextImage()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isLightboxOpen, showPrevImage, showNextImage])

  const handleDeleteImages = async () => {
    if (!confirm(`Delete ${selectedImages.length} image(s)?`)) return
    const targetIds = selectedImages
    const result = await deleteMedia(targetIds, gallery.id, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setGallery((prev) => ({
      ...prev,
      images: prev.images.filter((img) => !targetIds.includes(img.id)),
    }))
    setSelectedImages([])
    toast.success(`Deleted ${targetIds.length} image(s)`)
  }

  const handleToggleFavorite = async (imageId: string, next: boolean) => {
    const result = await setMediaFavorite([imageId], next, gallery.id, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setGallery((prev) => ({
      ...prev,
      images: prev.images.map((img) => (img.id === imageId ? { ...img, isFavorite: next } : img)),
    }))
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image?')) return
    const result = await deleteMedia([imageId], gallery.id, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setGallery((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== imageId),
    }))
    toast.success('Image deleted')
  }

  const handleShareGallery = async () => {
    const url = `${window.location.origin}/g/${gallery.shareToken}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Gallery link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const openAddToAlbum = (mediaIds: string[]) => {
    if (mediaIds.length === 0) return
    setAddToAlbumTargetIds(mediaIds)
    setAddToAlbumOpen(true)
  }

  const applyAddToAlbum = async (albumId: string | null) => {
    const result = await assignMediaToAlbum(addToAlbumTargetIds, albumId, gallery.id, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    const albumsById = new Map(result.albums.map((a) => [a.id, a]))
    setGallery((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        addToAlbumTargetIds.includes(img.id) ? { ...img, albumId: albumId ?? undefined } : img
      ),
      albums: prev.albums.map((a) => {
        const fresh = albumsById.get(a.id)
        return fresh ? { ...a, imageCount: fresh.media_count } : a
      }),
    }))
    toast.success(albumId ? 'Added to album' : 'Removed from album')
    setAddToAlbumOpen(false)
    setSelectedImages([])
    setAddToAlbumTargetIds([])
  }

  const openCreateAlbumDialog = () => {
    setAlbumDialogTarget(null)
    setAlbumName('')
    setAlbumDescription('')
    setAlbumDialogOpen(true)
  }

  const openEditAlbumDialog = (album: GalleryAlbum) => {
    setAlbumDialogTarget(album)
    setAlbumName(album.name)
    setAlbumDescription(album.description ?? '')
    setAlbumDialogOpen(true)
  }

  const submitAlbumDialog = async () => {
    if (!albumName.trim()) {
      toast.error('Album name is required')
      return
    }
    setAlbumSubmitting(true)
    const result = albumDialogTarget
      ? await updateAlbum(albumDialogTarget.id, gallery.id, studioSlug, albumName.trim(), albumDescription.trim() || undefined)
      : await createAlbum(gallery.id, studioSlug, albumName.trim(), albumDescription.trim() || undefined)
    setAlbumSubmitting(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }

    const updated: GalleryAlbum = {
      id: result.album.id,
      name: result.album.name,
      description: result.album.description ?? undefined,
      coverImageUrl: result.album.cover_image ?? undefined,
      imageCount: result.album.media_count,
      sortOrder: result.album.order,
      createdAt: result.album.created_at,
    }

    setGallery((prev) => ({
      ...prev,
      albums: albumDialogTarget
        ? prev.albums.map((a) => (a.id === updated.id ? updated : a))
        : [...prev.albums, updated],
    }))

    toast.success(albumDialogTarget ? 'Album updated' : 'Album created')
    setAlbumDialogOpen(false)
  }

  const handleDuplicateAlbum = async (album: GalleryAlbum) => {
    const result = await duplicateAlbum(album.id, gallery.id, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    const duplicated: GalleryAlbum = {
      id: result.album.id,
      name: result.album.name,
      description: result.album.description ?? undefined,
      coverImageUrl: result.album.cover_image ?? undefined,
      imageCount: result.album.media_count,
      sortOrder: result.album.order,
      createdAt: result.album.created_at,
    }
    setGallery((prev) => ({ ...prev, albums: [...prev.albums, duplicated] }))
    toast.success('Album duplicated (photos are not copied - a photo can only belong to one album)')
  }

  const confirmDeleteAlbum = async () => {
    if (!albumDeleteConfirm) return
    const target = albumDeleteConfirm
    const result = await deleteAlbum(target.id, gallery.id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      setAlbumDeleteConfirm(null)
      return
    }
    setGallery((prev) => ({
      ...prev,
      albums: prev.albums.filter((a) => a.id !== target.id),
      images: prev.images.map((img) => (img.albumId === target.id ? { ...img, albumId: undefined } : img)),
    }))
    if (albumFilter === target.id) setAlbumFilter(null)
    toast.success('Album deleted')
    setAlbumDeleteConfirm(null)
  }

  const handleStatusChange = async (status: Gallery['status']) => {
    const previousStatus = gallery.status
    if (status === previousStatus) return
    setGallery((prev) => ({ ...prev, status }))
    const result = await updateGalleryStatus(gallery.id, studioSlug, status)
    if ('error' in result) {
      setGallery((prev) => ({ ...prev, status: previousStatus }))
      toast.error(result.error)
      return
    }
    toast.success(status === 'published' ? 'Gallery published — share link is now live' : 'Gallery status updated')
  }

  const handleCancelSettings = () => {
    setSettingsForm(initialSettingsForm(gallery))
    setSettingsError(null)
  }

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSettingsError(null)
    setIsSavingSettings(true)

    const formData = new FormData()
    formData.set('id', gallery.id)
    formData.set('studio_slug', studioSlug)
    formData.set('name', settingsForm.name)
    formData.set('description', settingsForm.description)
    formData.set('type', settingsForm.type)
    formData.set('password_protected', String(settingsForm.passwordProtected))
    if (settingsForm.password) {
      formData.set('password', settingsForm.password)
    }
    formData.set('allow_download', String(settingsForm.downloadEnabled))
    formData.set('allow_favorites', String(settingsForm.allowFavorites))
    formData.set('allow_comments', String(settingsForm.allowComments))
    formData.set('watermark_enabled', String(settingsForm.watermarkEnabled))
    formData.set('expiry_days', settingsForm.expiryEnabled ? String(settingsForm.expiryDays) : '')

    try {
      await updateGallery(formData)
      // updateGallery redirects to this same route on success -- the
      // server component re-fetches and this component remounts with the
      // saved values, but update local state too so the tab reflects the
      // save immediately without waiting on the navigation.
      setGallery((prev) => ({
        ...prev,
        name: settingsForm.name,
        description: settingsForm.description,
        type: settingsForm.type,
        passwordProtected: settingsForm.passwordProtected,
        downloadEnabled: settingsForm.downloadEnabled,
        watermarkEnabled: settingsForm.watermarkEnabled,
        allowFavorites: settingsForm.allowFavorites,
        allowComments: settingsForm.allowComments,
        expiryDays: settingsForm.expiryEnabled ? settingsForm.expiryDays : undefined,
      }))
      setSettingsForm((prev) => ({ ...prev, password: '' }))
      toast.success('Gallery settings saved')
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setSettingsError(err.message || 'Failed to save gallery settings')
        toast.error(err.message || 'Failed to save gallery settings')
      } else if (!(err instanceof Error)) {
        throw err
      }
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleBulkAction = async (action: 'delete' | 'favorite' | 'download' | 'album') => {
    if (selectedImages.length === 0) return

    switch (action) {
      case 'delete':
        await handleDeleteImages()
        break
      case 'favorite': {
        const targetIds = selectedImages
        const allFavorited = gallery.images
          .filter((img) => targetIds.includes(img.id))
          .every((img) => img.isFavorite)
        const nextFavorite = !allFavorited
        const result = await setMediaFavorite(targetIds, nextFavorite, gallery.id, studioSlug)
        if ('error' in result) {
          toast.error(result.error)
          return
        }
        setGallery((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            targetIds.includes(img.id) ? { ...img, isFavorite: nextFavorite } : img
          ),
        }))
        setSelectedImages([])
        toast.success(nextFavorite ? 'Added to favorites' : 'Removed from favorites')
        break
      }
      case 'download':
        window.location.href = `/api/dashboard/galleries/${gallery.id}/bulk-download?ids=${selectedImages.join(',')}`
        break
      case 'album':
        openAddToAlbum(selectedImages)
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
              <StatusBadge status={gallery.status} />
              <Badge variant="outline">{GALLERY_TYPE_LABEL[gallery.type]}</Badge>
              {gallery.passwordProtected && (
                <Badge variant="outline" className="gap-1">
                  <span>🔐</span>
                  Password protected
                </Badge>
              )}
            </div>
            {gallery.description && (
              <p className="text-muted-foreground text-sm mt-1">{gallery.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Gallery
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}/design`}>
              <Palette className="h-4 w-4 mr-2" />
              Design
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareGallery}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button size="sm" asChild>
            <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}/upload`}>
              <Upload className="h-4 w-4 mr-2" />
              Add Images
            </Link>
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
        <TabsList className="grid grid-cols-2 sm:inline-flex sm:w-auto gap-1 mb-4 bg-transparent">
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
          {albumFilter && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-primary/10 text-sm">
              <FolderOpen className="h-4 w-4 text-primary" />
              <span>
                Showing album: <strong>{gallery.albums.find((a) => a.id === albumFilter)?.name ?? 'Unknown'}</strong>
              </span>
              <Button variant="ghost" size="sm" className="h-6 px-2 ml-auto" onClick={() => setAlbumFilter(null)}>
                <X className="h-3.5 w-3.5 mr-1" />
                Clear filter
              </Button>
            </div>
          )}
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
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${image.filename}`}
                      className={cn(
                        'relative group aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        selectedImages.includes(image.id) &&
                          'ring-2 ring-primary ring-offset-2 scale-[0.98]'
                      )}
                      onClick={() => handleImageClick(index)}
                      onKeyDown={(e) => handleImageTileKeyDown(e, index)}
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
                        aria-label={`Select ${image.filename}`}
                        className="absolute top-2 left-2 z-10 rounded border-input bg-white/90"
                      />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {image.isFavorite && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Remove from favorites"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleFavorite(image.id, false)
                            }}
                          >
                            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                          </Button>
                        )}
                      </div>
                      <Image
                        src={image.thumbnailUrl}
                        alt={image.filename}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                      />
                      {image.mimeType === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <PlayCircle className="h-8 w-8 text-white drop-shadow-lg" />
                        </div>
                      )}
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
                          <p className="font-medium truncate max-w-[200px]">{image.filename}</p>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{image.width} × {image.height}</TableCell>
                        <TableCell className="text-sm">{(image.size / 1024 / 1024).toFixed(1)} MB</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {format(new Date(image.uploadedAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${image.filename}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleImageClick(index)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Full Size
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`/api/dashboard/media/${image.id}/download`}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleFavorite(image.id, !image.isFavorite)}
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
                              <DropdownMenuItem onClick={() => openAddToAlbum([image.id])}>
                                <Square className="mr-2 h-4 w-4" />
                                Add to Album
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteImage(image.id)}
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
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${image.filename}`}
                    className={cn(
                        'relative break-inside-avoid mb-3 rounded-lg overflow-hidden cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        selectedImages.includes(image.id) &&
                          'ring-2 ring-primary ring-offset-2'
                      )}
                    onClick={() => handleImageClick(index)}
                    onKeyDown={(e) => handleImageTileKeyDown(e, index)}
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
                      aria-label={`Select ${image.filename}`}
                      className="absolute top-2 left-2 z-10 rounded border-input bg-white/90"
                    />
                    <Image
                      src={image.thumbnailUrl}
                      alt={image.filename}
                      width={400}
                      height={Math.round((400 / (image.width || 1)) * image.height)}
                      className="w-full h-auto object-cover transition-transform duration-300 hover:scale-[1.02]"
                    />
                    {image.mimeType === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle className="h-8 w-8 text-white drop-shadow-lg" />
                      </div>
                    )}
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
            <Button size="sm" onClick={openCreateAlbumDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Album
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {gallery.albums.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Square className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No albums yet</p>
                <Button className="mt-4" size="sm" onClick={openCreateAlbumDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Album
                </Button>
              </div>
            ) : (
              gallery.albums.map((album) => (
                <Card key={album.id} className="card-hover">
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {album.coverImageUrl ? (
                      <Image
                        src={album.coverImageUrl}
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
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setAlbumFilter(album.id)
                          setActiveTab('images')
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditAlbumDialog(album)}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="flex-1" aria-label={`Actions for ${album.name}`}>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDuplicateAlbum(album)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setAlbumDeleteConfirm(album)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
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
          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl" aria-label="Gallery settings">
            <div className="space-y-4">
              <h3 className="text-heading font-semibold">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Gallery Name</Label>
                  <Input
                    id="settings-name"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-link">Public Link</Label>
                  <Input id="settings-link" readOnly value={`/g/${gallery.shareToken}`} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="settings-description">Description</Label>
                  <Textarea
                    id="settings-description"
                    value={settingsForm.description}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-heading font-semibold">Gallery Settings</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={gallery.status} onValueChange={(value) => handleStatusChange(value as Gallery['status'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-caption text-muted-foreground">Saves immediately when changed.</p>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={settingsForm.type}
                    onValueChange={(value) => setSettingsForm((prev) => ({ ...prev, type: value as Gallery['type'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="settings-password-protected"
                    checked={settingsForm.passwordProtected}
                    onCheckedChange={(checked) => setSettingsForm((prev) => ({ ...prev, passwordProtected: checked }))}
                  />
                  <Label htmlFor="settings-password-protected">Password Protected</Label>
                </div>
                {settingsForm.passwordProtected && (
                  <div className="space-y-2">
                    <Label htmlFor="settings-password">Password</Label>
                    <Input
                      id="settings-password"
                      type="password"
                      placeholder="Leave blank to keep current password"
                      value={settingsForm.password}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-heading font-semibold">Display Options</h3>
              <p className="text-caption text-muted-foreground">
                Cover photo and color settings live on this gallery's{' '}
                <Link href={`/dashboard/${studioSlug}/galleries/${gallery.id}/design`} className="underline underline-offset-2">
                  Design page
                </Link>
                .
              </p>
              <div className="space-y-2 max-w-xs">
                <Label>Sort By (this view only)</Label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
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
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="settings-download"
                    checked={settingsForm.downloadEnabled}
                    onCheckedChange={(checked) => setSettingsForm((prev) => ({ ...prev, downloadEnabled: checked }))}
                  />
                  <Label htmlFor="settings-download">Enable Downloads</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="settings-favorites"
                    checked={settingsForm.allowFavorites}
                    onCheckedChange={(checked) => setSettingsForm((prev) => ({ ...prev, allowFavorites: checked }))}
                  />
                  <Label htmlFor="settings-favorites">Allow Favorites</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-heading font-semibold">Expiration</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="settings-expiry-enabled"
                    checked={settingsForm.expiryEnabled}
                    onCheckedChange={(checked) => setSettingsForm((prev) => ({ ...prev, expiryEnabled: checked }))}
                  />
                  <Label htmlFor="settings-expiry-enabled">Expire gallery link</Label>
                </div>
                <Input
                  type="number"
                  min={1}
                  placeholder="Days"
                  value={settingsForm.expiryDays}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, expiryDays: Number(e.target.value) || 1 }))}
                  disabled={!settingsForm.expiryEnabled}
                  className="w-[200px]"
                  aria-label="Expire gallery link after this many days"
                />
              </div>
            </div>

            {settingsError && <p className="text-sm text-destructive">{settingsError}</p>}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCancelSettings} disabled={isSavingSettings}>
                Cancel
              </Button>
              <Button type="submit" loading={isSavingSettings}>
                Save Changes
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="flex-1 overflow-auto">
          <div className="space-y-6 max-w-4xl">
            <div className="grid gap-4 md:grid-cols-3">
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
            </div>

            <Card>
              <CardHeader>
                <CardTitle>More analytics coming soon</CardTitle>
                <CardDescription>Views over time, top images, and traffic sources will appear here once we start tracking per-visit activity.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Album dialog */}
      <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{albumDialogTarget ? 'Edit album' : 'Create album'}</DialogTitle>
            <DialogDescription>
              {albumDialogTarget
                ? 'Update the name and description for this album.'
                : 'Give your new album a name to start organizing photos.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                placeholder="e.g. Ceremony"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={albumDescription}
                onChange={(e) => setAlbumDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlbumDialogOpen(false)} disabled={albumSubmitting}>
              Cancel
            </Button>
            <Button onClick={submitAlbumDialog} disabled={albumSubmitting}>
              {albumSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {albumDialogTarget ? 'Save changes' : 'Create album'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Album delete confirmation */}
      <Dialog open={!!albumDeleteConfirm} onOpenChange={(open) => !open && setAlbumDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete album</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{albumDeleteConfirm?.name}&quot;? Photos in this album will not be
              deleted, they&apos;ll just be unassigned. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlbumDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteAlbum}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to album picker */}
      <Dialog open={addToAlbumOpen} onOpenChange={setAddToAlbumOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to album</DialogTitle>
            <DialogDescription>
              {addToAlbumTargetIds.length > 1
                ? `Choose an album for ${addToAlbumTargetIds.length} photos.`
                : 'Choose an album for this photo.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => applyAddToAlbum(null)}
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent text-left"
            >
              <X className="h-4 w-4 text-muted-foreground" />
              No album
            </button>
            {gallery.albums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => applyAddToAlbum(album.id)}
                className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent text-left"
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                {album.name}
                <span className="text-muted-foreground ml-auto">{album.imageCount}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setAddToAlbumOpen(false)
                openCreateAlbumDialog()
              }}
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent text-left text-primary"
            >
              <Plus className="h-4 w-4" />
              New album
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToAlbumOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {isLightboxOpen && filteredImages.length > 0 && filteredImages[currentImageIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Media preview"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {filteredImages[currentImageIndex]!.mimeType !== 'video' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
                  onClick={(e) => { e.stopPropagation(); setLightboxZoom((z) => Math.max(0.5, z - 0.25)) }}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
                  onClick={(e) => { e.stopPropagation(); setLightboxZoom((z) => Math.min(3, z + 0.25)) }}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
                  onClick={(e) => { e.stopPropagation(); setLightboxRotation((r) => (r + 90) % 360) }}
                  aria-label="Rotate"
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
              onClick={(e) => { e.stopPropagation(); closeLightbox() }}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {filteredImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/10 hover:bg-white/20 text-white"
                onClick={(e) => { e.stopPropagation(); showPrevImage() }}
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/10 hover:bg-white/20 text-white"
                onClick={(e) => { e.stopPropagation(); showNextImage() }}
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          <div className="relative max-w-[90vw] max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            {filteredImages[currentImageIndex]!.mimeType === 'video' ? (
              filteredImages[currentImageIndex]!.videoPlaybackUrl ? (
                <video
                  key={filteredImages[currentImageIndex]!.id}
                  src={filteredImages[currentImageIndex]!.videoPlaybackUrl}
                  poster={filteredImages[currentImageIndex]!.thumbnailUrl}
                  controls
                  autoPlay
                  className="max-w-[90vw] max-h-[80vh]"
                />
              ) : (
                <div className="flex items-center justify-center text-white text-sm p-12">
                  This video isn&apos;t available right now.
                </div>
              )
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={filteredImages[currentImageIndex]!.url}
                alt={filteredImages[currentImageIndex]!.filename}
                className="max-w-[90vw] max-h-[80vh] object-contain transition-transform"
                style={{ transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)` }}
              />
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white text-sm">
            <span className="max-w-[240px] truncate">{filteredImages[currentImageIndex]!.filename}</span>
            <span className="text-white/60">{currentImageIndex + 1} / {filteredImages.length}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                handleToggleFavorite(filteredImages[currentImageIndex]!.id, !filteredImages[currentImageIndex]!.isFavorite)
              }}
            >
              <Heart className={cn('h-4 w-4 mr-1', filteredImages[currentImageIndex]!.isFavorite ? 'fill-red-500 text-red-500' : '')} />
              Favorite
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" asChild>
              <a
                href={`/api/dashboard/media/${filteredImages[currentImageIndex]!.id}/download`}
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

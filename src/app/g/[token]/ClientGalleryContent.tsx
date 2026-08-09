'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, Download, Heart, Share2, ChevronLeft, ChevronRight, X, Grid, Info, Lock, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

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

interface GalleryData {
  id: string
  studio_id: string
  name: string
  description?: string
  cover_image?: string
  type: 'event' | 'portrait' | 'wedding' | 'commercial' | 'other'
  client_name?: string
  shoot_date?: string
  media_count: number
  allow_download: boolean
  allow_comments: boolean
  allow_favorites: boolean
  watermark_enabled: boolean
  password_protected: boolean
  share_token: string
  studio?: {
    name: string
    slug: string
    logo_url?: string
    brand_color?: string
  }
  share_settings?: {
    custom_branding: boolean
    brand_name?: string
    brand_logo?: string
    brand_color?: string
    cover_image?: string
    allow_embed: boolean
    embed_width: number
    embed_height: number
    require_email: boolean
    collect_email: boolean
  }
  client?: { id: string; name: string; email: string }
  albums?: Album[]
  media?: MediaItem[]
}

interface ClientGalleryContentProps {
  gallery: GalleryData | null
  token: string
  embed?: boolean
  requirePassword?: boolean
  passwordError?: string
  error?: string
}

function transformMedia(dbMedia: any[]): MediaItem[] {
  return (dbMedia || []).map(m => ({
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

function transformAlbums(dbAlbums: any[]): Album[] {
  return (dbAlbums || []).map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    coverImage: a.cover_image,
    mediaCount: a.media_count,
    order: a.order,
    createdAt: a.created_at,
  }))
}

export function ClientGalleryContent({
  gallery,
  token,
  embed = false,
  requirePassword = false,
  passwordError,
  error,
}: ClientGalleryContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [showPassword] = React.useState(requirePassword)
  const [password, setPassword] = React.useState('')
  const [viewMode] = React.useState<'grid' | 'masonry'>('grid')
  const [, setSelectedMedia] = React.useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = React.useState(0)
  const [showLightbox, setShowLightbox] = React.useState(false)
  const [favorites, setFavorites] = React.useState<string[]>([])

  // Transform data if gallery exists
  const media = React.useMemo(() => gallery ? transformMedia(gallery.media || []) : [], [gallery])
  const albums = React.useMemo(() => gallery ? transformAlbums(gallery.albums || []) : [], [gallery])

  const brandColor = (gallery?.share_settings?.custom_branding
    ? gallery.share_settings.brand_color || gallery.studio?.brand_color
    : gallery?.studio?.brand_color) || '#3b82f6'

  const style = React.useMemo(() => ({
    '--brand-color': brandColor,
    '--brand-color-hover': adjustColor(brandColor, -20),
  }), [brandColor])

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    // Redirect with password in URL
    const params = new URLSearchParams(searchParams.toString())
    params.set('password', password)
    router.push(`?${params.toString()}`)
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setShowLightbox(true)
  }

  const closeLightbox = () => {
    setShowLightbox(false)
    setSelectedMedia(null)
  }

  const downloadImage = async (item: MediaItem) => {
    try {
      // Increment download count on server
      await fetch(`/api/galleries/${token}/download`, { method: 'POST' }).catch(console.error)

      const response = await fetch(item.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Download started')
    } catch {
      toast.error('Failed to download')
    }
  }

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
    toast.success(favorites.includes(id) ? 'Removed from favorites' : 'Added to favorites')
  }

  const shareGallery = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: gallery?.name || 'Gallery',
          text: gallery?.description,
          url: window.location.href,
        })
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-8">
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            {gallery && gallery.studio && !embed && (
              <Link href={`/${gallery.studio.slug}`}>
                <Button variant="outline">Back to Studio</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show password prompt
  if (showPassword && requirePassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Password Protected</CardTitle>
            <CardDescription>
              This gallery is password protected. Please enter the password to view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPassword} className="space-y-4">
              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  disabled={!gallery}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!gallery}>
                Unlock Gallery
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading or no gallery
  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    )
  }

  // Get branding from share settings or studio
  const branding = gallery.share_settings?.custom_branding
    ? {
        name: gallery.share_settings.brand_name || gallery.studio?.name,
        logo: gallery.share_settings.brand_logo || gallery.studio?.logo_url,
        color: gallery.share_settings.brand_color || gallery.studio?.brand_color,
        coverImage: gallery.share_settings.cover_image || gallery.cover_image,
      }
    : {
        name: gallery.studio?.name || 'LensFlow',
        logo: gallery.studio?.logo_url,
        color: gallery.studio?.brand_color,
        coverImage: gallery.cover_image,
      }

  const renderMediaGrid = () => {
    const filteredMedia = albums.length > 0 && albums.find(a => a.id === searchParams.get('album'))
      ? media.filter(m => m.albumId === searchParams.get('album'))
      : media

    if (filteredMedia.length === 0) {
      return (
        <div className="col-span-full text-center py-12">
          <div className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4">
            <Grid className="h-12 w-12" />
          </div>
          <h3 className="text-heading text-muted-foreground">No photos in this album</h3>
        </div>
      )
    }

    return filteredMedia.map((item, index) => (
      <div
        key={item.id}
        className={cn(
          'relative group overflow-hidden rounded-xl bg-muted transition-all duration-200 cursor-pointer',
          viewMode === 'grid' ? 'aspect-square' : undefined
        )}
        onClick={() => openLightbox(index)}
      >
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="secondary" size="icon" className="h-10 w-10">
            <Eye className="h-5 w-5" />
          </Button>
        </div>

        <img
          src={item.thumbnailUrl}
          alt={item.filename}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {item.isFavorite && (
          <div className="absolute top-1 right-1">
            <Heart className="h-5 w-5 text-red-500 fill-current drop-shadow" />
          </div>
        )}

        {item.type === 'video' && (
          <div className="absolute bottom-1 right-1 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <Download className="h-3 w-3" />
            Video
          </div>
        )}

        {item.commentCount > 0 && (
          <div className="absolute bottom-1 left-1 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <Share2 className="h-3 w-3" />
            {item.commentCount}
          </div>
        )}
      </div>
    ))
  }

  const renderAlbums = () => {
    if (!albums.length && !embed) {
      return null
    }
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-heading font-semibold text-foreground">Albums</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.delete('album')
              router.push(`?${params.toString()}`)
            }}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              !searchParams.get('album')
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            All Photos
          </button>
          {albums.map(album => (
            <button
              key={album.id}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('album', album.id)
                router.push(`?${params.toString()}`)
              }}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                searchParams.get('album') === album.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {album.name} ({album.mediaCount})
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" style={style as React.CSSProperties}>
      {/* Branding Header */}
      {!embed && (
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-border">
          <div className="flex items-center gap-4">
            {branding.logo ? (
              <img src={branding.logo} alt={branding.name} className="h-10 w-auto" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  {branding.name?.charAt(0) || 'L'}
                </span>
              </div>
            )}
            <div>
              <h1 className="font-display font-bold text-xl">{gallery.name}</h1>
              {gallery.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">{gallery.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gallery.client_name && (
              <span className="text-sm text-muted-foreground mr-2">{gallery.client_name}</span>
            )}
            <Button variant="ghost" size="icon" onClick={shareGallery} aria-label="Share gallery">
              <Share2 className="h-5 w-5" />
            </Button>
            {gallery.allow_download && (
              <Button variant="ghost" size="icon" aria-label="Download all">
                <Download className="h-5 w-5" />
              </Button>
            )}
          </div>
        </header>
      )}

      {/* Gallery Info */}
      {!embed && (
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground px-4">
          {gallery.shoot_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(gallery.shoot_date), 'MMM d, yyyy')}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Grid className="h-4 w-4" />
            {gallery.media_count} photos
          </span>
        </div>
      )}

      {/* Albums */}
      {!embed && renderAlbums()}

      {/* Media Grid */}
      <div className={cn(
        'grid gap-3 px-4',
        viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      )}>
        {renderMediaGrid()}
      </div>

      {/* Lightbox */}
      {showLightbox && media.length > 0 && media[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/10 hover:bg-white/20 text-white"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev === 0 ? media.length - 1 : prev - 1) }}
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={media[lightboxIndex]!.url}
              alt={media[lightboxIndex]!.filename}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={e => e.stopPropagation()}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/10 hover:bg-white/20 text-white"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev === media.length - 1 ? 0 : prev + 1) }}
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
            onClick={closeLightbox}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white text-sm">
            <span>{lightboxIndex + 1} / {media.length}</span>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); downloadImage(media[lightboxIndex]!) }}>
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); toggleFavorite(media[lightboxIndex]!.id) }}>
              <Heart className={cn('h-4 w-4 mr-1', favorites.includes(media[lightboxIndex]!.id) ? 'fill-red-500 text-red-500' : '')} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}
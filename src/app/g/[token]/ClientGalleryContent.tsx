'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Info, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { GalleryNav } from '@/components/galleries/viewer/GalleryNav'
import { GalleryHero } from '@/components/galleries/viewer/GalleryHero'
import { GalleryFilters } from '@/components/galleries/viewer/GalleryFilters'
import { EditorialGallery } from '@/components/galleries/viewer/EditorialGallery'
import { GalleryLightbox } from '@/components/galleries/viewer/GalleryLightbox'
import type { Album, GalleryBranding, GalleryData, GalleryViewMode, MediaItem } from '@/components/galleries/viewer/types'

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
    videoPlaybackUrl: m.video_playback_url,
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

const GALLERY_TYPE_LABEL: Record<GalleryData['type'], string> = {
  event: 'Event',
  portrait: 'Portrait',
  wedding: 'Wedding',
  commercial: 'Commercial',
  other: 'Gallery',
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
  const [lightboxIndex, setLightboxIndex] = React.useState(0)
  const [showLightbox, setShowLightbox] = React.useState(false)
  const [favorites, setFavorites] = React.useState<string[]>([])
  const [downloadingIds, setDownloadingIds] = React.useState<Set<string>>(new Set())
  const [isDownloadingAll, setIsDownloadingAll] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<GalleryViewMode>('editorial')
  const [activeAlbumId, setActiveAlbumId] = React.useState<string | null>(searchParams.get('album'))
  const lightboxHistoryPushed = React.useRef(false)

  // Pressing the browser/device back button while the lightbox is open should
  // close the lightbox and return to the grid, not exit the whole gallery page.
  React.useEffect(() => {
    const onPopState = () => {
      if (lightboxHistoryPushed.current) {
        lightboxHistoryPushed.current = false
        setShowLightbox(false)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Transform data if gallery exists
  const media = React.useMemo(() => gallery ? transformMedia(gallery.media || []) : [], [gallery])
  const albums = React.useMemo(() => gallery ? transformAlbums(gallery.albums || []) : [], [gallery])

  // An ?album= value that doesn't match a real album (stale link, typo) falls
  // back to "All" instead of showing an empty gallery.
  const selectedAlbumId = activeAlbumId && albums.some(a => a.id === activeAlbumId) ? activeAlbumId : null

  // The lightbox navigates exactly what the grid shows. It previously walked the
  // full `media` list while the grid was album-filtered, so opening a photo in an
  // album could display a different photo.
  const visibleMedia = React.useMemo(
    () => (selectedAlbumId ? media.filter(m => m.albumId === selectedAlbumId) : media),
    [media, selectedAlbumId],
  )

  // Seed local favorites from whatever's already saved for this gallery
  React.useEffect(() => {
    setFavorites(media.filter(m => m.isFavorite).map(m => m.id))
  }, [media])
  const favoriteSet = React.useMemo(() => new Set(favorites), [favorites])

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

  // Album switching is purely a client-side filter. It used to router.push(),
  // which re-ran the server page: another full gallery fetch and another view
  // counted for what is just a tab change. The URL is still kept in sync so a
  // filtered view stays linkable.
  const selectAlbum = (albumId: string | null) => {
    setActiveAlbumId(albumId)
    const params = new URLSearchParams(window.location.search)
    if (albumId) params.set('album', albumId)
    else params.delete('album')
    const query = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setShowLightbox(true)
    window.history.pushState({ lightbox: true }, '')
    lightboxHistoryPushed.current = true
  }

  const closeLightbox = () => {
    setShowLightbox(false)
    if (lightboxHistoryPushed.current) {
      lightboxHistoryPushed.current = false
      window.history.back()
    }
  }

  const downloadSingleImage = async (item: MediaItem) => {
    // Tracking the download count is a side-effect, not a gate — fire it and
    // move on rather than awaiting it. A slow or stuck edge/analytics call
    // must never be able to block the client from getting their actual
    // photo. Give it a short timeout of its own so it can't hang open
    // indefinitely either.
    const trackingController = new AbortController()
    const trackingTimeout = setTimeout(() => trackingController.abort(), 5000)
    fetch(`/api/g/${token}/download`, { method: 'POST', signal: trackingController.signal })
      .catch(() => {})
      .finally(() => clearTimeout(trackingTimeout))

    // Gated, server-authoritative route — the studio's plan (and, for a
    // password-protected gallery, the password itself) are checked again
    // here even though the download button is already conditionally shown.
    const passwordParam = searchParams.get('password')
    const downloadUrl = passwordParam
      ? `/api/storage/${item.id}/download?password=${encodeURIComponent(passwordParam)}`
      : `/api/storage/${item.id}/download`
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.error || 'Failed to download')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const downloadImage = async (item: MediaItem) => {
    if (downloadingIds.has(item.id)) return
    setDownloadingIds((prev) => new Set(prev).add(item.id))
    try {
      await downloadSingleImage(item)
      toast.success('Download started')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download')
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const downloadAllImages = async () => {
    if (media.length === 0 || isDownloadingAll) return
    setIsDownloadingAll(true)
    try {
      const passwordParam = searchParams.get('password')
      const bulkDownloadUrl = passwordParam
        ? `/api/g/${token}/bulk-download?password=${encodeURIComponent(passwordParam)}`
        : `/api/g/${token}/bulk-download`
      const response = await fetch(bulkDownloadUrl, { method: 'POST' })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Bulk download is not available for this gallery')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${gallery?.name || 'gallery'}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(`Downloading ${media.length} photo${media.length === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Some downloads failed')
    } finally {
      setIsDownloadingAll(false)
    }
  }

  const toggleFavorite = async (id: string) => {
    const wasFavorite = favorites.includes(id)
    setFavorites(prev => wasFavorite ? prev.filter(f => f !== id) : [...prev, id])

    try {
      // Gated, server-authoritative route -- for a password-protected
      // gallery the password itself is re-verified there, same as the
      // download routes below.
      const passwordParam = searchParams.get('password')
      const response = await fetch(`/api/g/${token}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: id, isFavorite: !wasFavorite, password: passwordParam ?? undefined }),
      })
      if (!response.ok) throw new Error('Request failed')
      toast.success(wasFavorite ? 'Removed from favorites' : 'Added to favorites')
    } catch {
      setFavorites(prev => wasFavorite ? [...prev, id] : prev.filter(f => f !== id))
      toast.error('Failed to update favorite')
    }
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
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard')
      } catch {
        toast.error('Failed to copy link')
      }
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
  const branding: GalleryBranding = gallery.share_settings?.custom_branding
    ? {
        name: gallery.share_settings.brand_name || gallery.studio?.name || 'LensFlow',
        logo: gallery.share_settings.brand_logo || gallery.studio?.logo_url,
        color: gallery.share_settings.brand_color || gallery.studio?.brand_color || '#3b82f6',
        coverImage: gallery.share_settings.cover_image || gallery.cover_image,
      }
    : {
        name: gallery.studio?.name || 'LensFlow',
        logo: gallery.studio?.logo_url,
        color: gallery.studio?.brand_color || '#3b82f6',
        coverImage: gallery.cover_image,
      }

  const canFavorite = gallery.allow_favorites
  const canDownload = gallery.allow_download

  return (
    <div className="gallery-viewer min-h-screen" style={style as React.CSSProperties}>
      {!embed && (
        <GalleryNav
          branding={branding}
          studioSlug={gallery.studio?.slug}
          headingFont={gallery.heading_font}
          onShare={shareGallery}
          onDownloadAll={canDownload ? downloadAllImages : undefined}
          isDownloadingAll={isDownloadingAll}
        />
      )}

      <main>
        {!embed && (
          <GalleryHero
            title={gallery.name}
            eyebrow={GALLERY_TYPE_LABEL[gallery.type] === 'Gallery' ? 'Gallery' : `${GALLERY_TYPE_LABEL[gallery.type]} gallery`}
            description={gallery.description}
            clientName={gallery.client_name}
            dateLabel={gallery.shoot_date ? format(new Date(gallery.shoot_date), 'MMM d, yyyy') : undefined}
            photoCount={gallery.media_count ?? media.length}
            // Falls back to the first photo so a gallery with no explicit cover
            // still gets a hero instead of an empty text block.
            coverImageUrl={branding.coverImage || media[0]?.thumbnailUrl}
            headingFont={gallery.heading_font}
          />
        )}

        {!embed && (
          <GalleryFilters
            albums={albums}
            activeAlbumId={selectedAlbumId}
            onSelectAlbum={selectAlbum}
            totalCount={media.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}

        <div className={embed ? 'pt-4' : undefined}>
          <EditorialGallery
            key={selectedAlbumId ?? 'all'}
            items={visibleMedia}
            viewMode={viewMode}
            favorites={favoriteSet}
            canFavorite={canFavorite}
            onOpen={openLightbox}
            onToggleFavorite={toggleFavorite}
          />
        </div>
      </main>

      {!embed && gallery.entitlements?.showPoweredByBadge && (
        <footer className="border-t border-border py-8 text-center">
          <a
            href="https://lensflow.co.ke"
            target="_blank"
            rel="noreferrer"
            className="label-caption rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Powered by LensFlow
          </a>
        </footer>
      )}

      {showLightbox && visibleMedia.length > 0 && (
        <GalleryLightbox
          items={visibleMedia}
          index={Math.min(lightboxIndex, visibleMedia.length - 1)}
          onIndexChange={setLightboxIndex}
          onClose={closeLightbox}
          canDownload={canDownload}
          onDownload={downloadImage}
          downloadingIds={downloadingIds}
          canFavorite={canFavorite}
          favorites={favoriteSet}
          onToggleFavorite={toggleFavorite}
        />
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

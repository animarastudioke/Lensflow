'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Download, Heart, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MediaItem } from './types'

interface GalleryLightboxProps {
  items: MediaItem[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  canDownload: boolean
  onDownload: (item: MediaItem) => void
  downloadingIds: ReadonlySet<string>
  canFavorite: boolean
  favorites: ReadonlySet<string>
  onToggleFavorite: (id: string) => void
}

const SWIPE_MIN_DISTANCE = 50
const FOCUSABLE = 'button:not([disabled]), [href], video, input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function GalleryLightbox({
  items,
  index,
  onIndexChange,
  onClose,
  canDownload,
  onDownload,
  downloadingIds,
  canFavorite,
  favorites,
  onToggleFavorite,
}: GalleryLightboxProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const touch = React.useRef<{ x: number; y: number; multi: boolean } | null>(null)
  const count = items.length
  const item = items[index]

  // The keyboard/focus effect below must run once per open. Reading the latest
  // props through a ref keeps it from re-running (and yanking focus back to the
  // dialog) every time the parent re-renders or the index changes.
  const latest = React.useRef({ onClose, onIndexChange, index, count })
  React.useEffect(() => {
    latest.current = { onClose, onIndexChange, index, count }
  })

  const go = React.useCallback((delta: number) => {
    const { onIndexChange: change, index: current, count: total } = latest.current
    if (total < 2) return
    change((current + delta + total) % total)
  }, [])

  // Escape/arrow keys, a focus trap so Tab can't reach the page behind the
  // overlay, focus restoration to whatever opened it, and a background scroll lock.
  React.useEffect(() => {
    const container = containerRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    container?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        latest.current.onClose()
        return
      }
      if (e.key === 'ArrowLeft') {
        go(-1)
        return
      }
      if (e.key === 'ArrowRight') {
        go(1)
        return
      }
      if (e.key === 'Tab' && container) {
        const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (focusables.length === 0) return
        const first = focusables[0]!
        const last = focusables[focusables.length - 1]!
        if (e.shiftKey && (document.activeElement === first || document.activeElement === container)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [go])

  // Warm the browser cache for the neighbours so next/prev feels instant.
  React.useEffect(() => {
    if (count < 2) return
    for (const offset of [-1, 1]) {
      const neighbour = items[(index + offset + count) % count]
      if (neighbour && neighbour.type === 'image') {
        const img = new window.Image()
        img.src = neighbour.url
      }
    }
  }, [index, count, items])

  if (!item) return null

  const isFavorite = favorites.has(item.id)
  const isDownloading = downloadingIds.has(item.id)

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    touch.current = { x: t.clientX, y: t.clientY, multi: e.touches.length > 1 }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (touch.current && e.touches.length > 1) touch.current.multi = true
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current
    touch.current = null
    const t = e.changedTouches[0]
    // A pinch-zoom must never read as a swipe.
    if (!start || !t || start.multi) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) >= SWIPE_MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1)
    }
  }

  const iconButton =
    'h-11 w-11 text-foreground/80 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      tabIndex={-1}
      className="gv-fade fixed inset-0 z-50 flex flex-col bg-background outline-none"
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-3 sm:px-5">
        <span className="font-mono text-xs tracking-[0.12em] text-muted-foreground" aria-live="polite">
          {`${index + 1} / ${count}`}
        </span>
        <div className="flex items-center gap-1">
          {canFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className={iconButton}
              onClick={() => onToggleFavorite(item.id)}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={cn('h-5 w-5', isFavorite && 'fill-[hsl(var(--gv-accent))] text-[hsl(var(--gv-accent))]')} />
            </Button>
          )}
          {canDownload && (
            <Button
              variant="ghost"
              size="icon"
              className={iconButton}
              disabled={isDownloading}
              onClick={() => onDownload(item)}
              aria-label="Download photo"
            >
              {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className={iconButton} onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 [touch-action:pan-y_pinch-zoom]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          // Clicking the empty backdrop closes; clicking the photo itself does not.
          if (e.target === e.currentTarget || (e.target as HTMLElement).dataset['backdrop'] === 'true') onClose()
        }}
      >
        <div data-backdrop="true" className="absolute inset-0 flex items-center justify-center px-2 sm:px-20">
          {item.type === 'video' ? (
            item.videoPlaybackUrl ? (
              <video
                key={item.id}
                src={item.videoPlaybackUrl}
                poster={item.url}
                controls
                autoPlay
                playsInline
                className="gv-fade max-h-full max-w-full"
              />
            ) : (
              <p className="p-12 text-sm text-muted-foreground">This video isn&apos;t available right now.</p>
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.url}
              alt={item.filename}
              draggable={false}
              className="gv-fade max-h-full max-w-full select-none object-contain"
            />
          )}
        </div>

        {count > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(iconButton, 'absolute left-1 top-1/2 -translate-y-1/2 sm:left-4')}
              onClick={() => go(-1)}
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(iconButton, 'absolute right-1 top-1/2 -translate-y-1/2 sm:right-4')}
              onClick={() => go(1)}
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Clients refer to photos by filename when proofing, so show it. */}
      <div className="flex h-12 shrink-0 items-center justify-center px-4">
        <span className="truncate font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground">{item.filename}</span>
      </div>
    </div>
  )
}

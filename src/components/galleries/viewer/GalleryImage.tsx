'use client'

import * as React from 'react'
import { Heart, MessageCircle, PlayCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GalleryViewMode, MediaItem } from './types'

interface GalleryImageProps {
  item: MediaItem
  /** 1-based position within the currently shown list. */
  number: number
  viewMode: GalleryViewMode
  isFavorite: boolean
  canFavorite: boolean
  onOpen: () => void
  onToggleFavorite: () => void
}

// The tile is a role="button" <div> with the favorite <button> as a *sibling*,
// not a child: nesting a button inside role="button" is invalid and makes the
// inner control unreachable for assistive tech.
export function GalleryImage({ item, number, viewMode, isFavorite, canFavorite, onOpen, onToggleFavorite }: GalleryImageProps) {
  const hasDimensions = item.width > 0 && item.height > 0
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <div className="group relative">
      <div
        role="button"
        tabIndex={0}
        aria-label={`View ${item.filename}`}
        onClick={onOpen}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative block cursor-pointer overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          viewMode === 'grid' && 'aspect-[4/5]',
        )}
      >
        {/* Always the thumbnail variant; the full preview only loads in the
            lightbox. Intrinsic width/height + aspect-ratio reserve the space
            so lazy loading never shifts the layout. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnailUrl}
          alt={item.filename}
          width={hasDimensions ? item.width : undefined}
          height={hasDimensions ? item.height : undefined}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(
            'block w-full transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none',
            viewMode === 'grid' ? 'h-full object-cover' : 'h-auto',
          )}
          style={viewMode === 'editorial' ? { aspectRatio: hasDimensions ? `${item.width} / ${item.height}` : '4 / 5' } : undefined}
        />

        <div className="pointer-events-none absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/55 via-transparent to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
          <span className="font-mono text-[0.6875rem] tracking-[0.12em] text-white/90">{String(number).padStart(2, '0')}</span>
          <span className="flex items-center gap-2 text-white/90">
            {item.commentCount > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {item.commentCount}
              </span>
            )}
            {item.type === 'video' && <PlayCircle className="h-4 w-4" aria-label="Video" />}
          </span>
        </div>
      </div>

      {canFavorite && (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remove ${item.filename} from favorites` : `Add ${item.filename} to favorites`}
          className={cn(
            'absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-[opacity,transform] duration-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 motion-reduce:transition-none',
            // Always visible on touch (no hover there); revealed on hover/focus for pointer devices.
            !isFavorite && '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100',
          )}
        >
          <Heart
            className={cn('h-[18px] w-[18px]', isFavorite && 'fill-[hsl(var(--gv-accent))] text-[hsl(var(--gv-accent))]')}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  )
}

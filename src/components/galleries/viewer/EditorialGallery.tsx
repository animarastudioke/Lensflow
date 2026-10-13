'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GalleryImage } from './GalleryImage'
import type { GalleryViewMode, MediaItem } from './types'

interface EditorialGalleryProps {
  items: MediaItem[]
  viewMode: GalleryViewMode
  favorites: ReadonlySet<string>
  canFavorite: boolean
  onOpen: (index: number) => void
  onToggleFavorite: (id: string) => void
  pageSize?: number
}

const PAGE_SIZE = 48

// Editorial = CSS columns over each photo's natural aspect ratio: portraits and
// landscapes keep their real shape and the rhythm falls out of the photographs
// themselves. It is fully deterministic (no JS measurement, no random layout)
// and needs no masonry dependency. Trade-off: columns fill top-to-bottom, so
// reading order runs down each column — the Grid view keeps strict row order.
export function EditorialGallery({ items, viewMode, favorites, canFavorite, onOpen, onToggleFavorite, pageSize = PAGE_SIZE }: EditorialGalleryProps) {
  // Callers re-mount this (via `key`) when the album changes, which resets the page.
  const [visibleCount, setVisibleCount] = React.useState(pageSize)
  const shown = items.slice(0, visibleCount)
  const remaining = items.length - shown.length

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-24 text-center sm:px-6 lg:px-10">
        <p className="font-display text-heading-lg text-foreground">No photos here yet</p>
        <p className="mt-2 text-body-sm text-muted-foreground">New photos will appear as soon as they are added.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-10">
      <div
        className={cn(
          viewMode === 'editorial'
            ? 'columns-2 gap-3 lg:columns-3 lg:gap-4 2xl:columns-4'
            : 'grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4',
        )}
      >
        {shown.map((item, index) => (
          <div key={item.id} className={cn(viewMode === 'editorial' && 'mb-3 break-inside-avoid lg:mb-4')}>
            <GalleryImage
              item={item}
              number={index + 1}
              viewMode={viewMode}
              isFavorite={favorites.has(item.id)}
              canFavorite={canFavorite}
              onOpen={() => onOpen(index)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
            />
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3" aria-live="polite">
        <p className="label-caption">
          Showing {shown.length} of {items.length}
        </p>
        {remaining > 0 && (
          <Button variant="outline" onClick={() => setVisibleCount((c) => c + pageSize)}>
            Show {Math.min(pageSize, remaining)} more
          </Button>
        )}
      </div>
    </div>
  )
}

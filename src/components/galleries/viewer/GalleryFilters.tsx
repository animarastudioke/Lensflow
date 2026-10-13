'use client'

import { Columns3, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Album, GalleryViewMode } from './types'

interface GalleryFiltersProps {
  albums: Album[]
  activeAlbumId: string | null
  onSelectAlbum: (albumId: string | null) => void
  totalCount: number
  viewMode: GalleryViewMode
  onViewModeChange: (mode: GalleryViewMode) => void
}

const pill =
  'inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

// Categories are the gallery's real albums — nothing is invented. With no
// albums the filter row collapses and only the view controls remain.
export function GalleryFilters({ albums, activeAlbumId, onSelectAlbum, totalCount, viewMode, onViewModeChange }: GalleryFiltersProps) {
  const views: { mode: GalleryViewMode; label: string; Icon: typeof Columns3 }[] = [
    { mode: 'editorial', label: 'Editorial layout', Icon: Columns3 },
    { mode: 'grid', label: 'Uniform grid', Icon: LayoutGrid },
  ]

  return (
    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-10">
      {albums.length > 0 ? (
        <nav aria-label="Albums" className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex items-center gap-2">
            <li>
              <button
                type="button"
                aria-pressed={activeAlbumId === null}
                onClick={() => onSelectAlbum(null)}
                className={cn(
                  pill,
                  activeAlbumId === null
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                )}
              >
                All <span className="ml-1.5 opacity-60">{totalCount}</span>
              </button>
            </li>
            {albums.map((album) => (
              <li key={album.id}>
                <button
                  type="button"
                  aria-pressed={activeAlbumId === album.id}
                  onClick={() => onSelectAlbum(album.id)}
                  className={cn(
                    pill,
                    activeAlbumId === album.id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                  )}
                >
                  {album.name} <span className="ml-1.5 opacity-60">{album.mediaCount}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <div className="flex-1" />
      )}

      <div role="group" aria-label="Gallery view" className="hidden shrink-0 items-center rounded-md border border-border p-0.5 sm:flex">
        {views.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            type="button"
            aria-label={label}
            aria-pressed={viewMode === mode}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              viewMode === mode ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}

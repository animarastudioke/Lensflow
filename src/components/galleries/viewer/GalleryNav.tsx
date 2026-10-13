'use client'

import Link from 'next/link'
import { Download, Loader2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { headingFontClass, type HeadingFont } from '@/components/galleries/GalleryCoverPreview'
import { cn } from '@/lib/utils'
import type { GalleryBranding } from './types'

interface GalleryNavProps {
  branding: GalleryBranding
  studioSlug?: string
  headingFont?: HeadingFont
  onShare: () => void
  /** Omit when downloads are disabled for this gallery. */
  onDownloadAll?: () => void
  isDownloadingAll?: boolean
}

// The photographer's identity leads; LensFlow stays out of the nav entirely
// (its attribution lives in the footer, and only when the plan requires it).
// Marketing-site links (Home/Galleries/Bookings) are deliberately absent: a
// client opening a shared link has no use for them and no account to land in.
export function GalleryNav({ branding, studioSlug, headingFont, onShare, onDownloadAll, isDownloadingAll }: GalleryNavProps) {
  const brand = (
    <span className="flex min-w-0 items-center gap-3">
      {branding.logo && (
        // eslint-disable-next-line @next/next/no-img-element -- studio logos live on arbitrary hosts outside next/image's allowlist
        <img src={branding.logo} alt="" className="h-7 w-auto max-w-[120px] shrink-0 object-contain" />
      )}
      <span className={cn(headingFontClass(headingFont), 'truncate text-heading-sm tracking-wide')}>
        {branding.name}
      </span>
    </span>
  )

  return (
    <header className="glass sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        {studioSlug ? (
          <Link
            href={`/${studioSlug}`}
            className="min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`${branding.name} home`}
          >
            {brand}
          </Link>
        ) : (
          <div className="min-w-0">{brand}</div>
        )}

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onShare} aria-label="Share gallery">
            <Share2 className="h-[18px] w-[18px]" />
          </Button>
          {onDownloadAll && (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={onDownloadAll}
              disabled={isDownloadingAll}
              aria-label="Download all"
            >
              {isDownloadingAll ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Download className="h-[18px] w-[18px]" />}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

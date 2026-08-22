'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Download, Heart, MessageCircle, Share2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GALLERY_SHOWCASE_IMAGES } from '@/lib/constants/homepage'

const DEMO_IMAGES = GALLERY_SHOWCASE_IMAGES.slice(0, 6)

type DownloadState = 'idle' | 'preparing' | 'done'

export function GalleriesDemo() {
  const [favorites, setFavorites] = useState<Set<number>>(new Set([1]))
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')

  function toggleFavorite(index: number, event?: MouseEvent) {
    event?.stopPropagation()
    setFavorites((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function startDownload(event?: MouseEvent) {
    event?.stopPropagation()
    if (downloadState !== 'idle') return
    setDownloadState('preparing')
    window.setTimeout(() => setDownloadState('done'), 1100)
    window.setTimeout(() => setDownloadState('idle'), 3000)
  }

  useEffect(() => {
    if (openIndex === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenIndex(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openIndex])

  return (
    <div className="p-4 text-white sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Amara &amp; David — Wedding</p>
          <p className="text-xs text-white/45">{DEMO_IMAGES.length} photos · shared with 2 people</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Share gallery"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={startDownload}
            className="flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60"
            disabled={downloadState !== 'idle'}
          >
            {downloadState === 'idle' && (
              <>
                <Download className="h-3.5 w-3.5" /> Download all
              </>
            )}
            {downloadState === 'preparing' && 'Preparing…'}
            {downloadState === 'done' && (
              <>
                <Check className="h-3.5 w-3.5" /> Downloaded
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {DEMO_IMAGES.map((image, index) => (
          <div
            key={image.src}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-md bg-white/5',
              index === 0 && 'col-span-2 row-span-2'
            )}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`View photo ${index + 1} of ${DEMO_IMAGES.length}`}
              className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-inset"
            >
              <Image
                src={`https://images.unsplash.com/${image.src}?w=600&q=70&auto=format&fit=crop`}
                alt={image.alt}
                fill
                sizes="(max-width: 640px) 33vw, 300px"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </button>
            <button
              type="button"
              onClick={(event) => toggleFavorite(index, event)}
              aria-label={favorites.has(index) ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={favorites.has(index)}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 backdrop-blur transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-90"
            >
              <Heart
                className={cn(
                  'h-3.5 w-3.5 transition-colors',
                  favorites.has(index) ? 'fill-[#d6415a] text-[#d6415a]' : 'text-white'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {openIndex !== null ? (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col bg-black/95"
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-white/60">
                {openIndex + 1} of {DEMO_IMAGES.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => toggleFavorite(openIndex, event)}
                  className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label={favorites.has(openIndex) ? 'Remove from favorites' : 'Add to favorites'}
                  aria-pressed={favorites.has(openIndex)}
                >
                  <Heart
                    className={cn(
                      'h-4 w-4',
                      favorites.has(openIndex) ? 'fill-[#d6415a] text-[#d6415a]' : ''
                    )}
                  />
                </button>
                <button
                  type="button"
                  className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Comment"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpenIndex(null)}
                  className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Close viewer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative flex-1">
              <Image
                src={`https://images.unsplash.com/${DEMO_IMAGES[openIndex]!.src}?w=1200&q=75&auto=format&fit=crop`}
                alt={DEMO_IMAGES[openIndex]!.alt}
                fill
                sizes="600px"
                className="object-contain"
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

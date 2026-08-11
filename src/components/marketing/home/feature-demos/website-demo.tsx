'use client'

import Image from 'next/image'
import { GALLERY_SHOWCASE_IMAGES } from '@/lib/constants/homepage'

const NAV_ITEMS = ['Portfolio', 'About', 'Gallery', 'Pricing', 'Contact', 'Booking']
const PREVIEW_IMAGES = GALLERY_SHOWCASE_IMAGES.slice(2, 5)

export function WebsiteDemo() {
  return (
    <div className="text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <span className="font-display text-sm italic">Amara Wren Photography</span>
        <nav className="hidden gap-4 text-[11px] text-white/55 sm:flex">
          {NAV_ITEMS.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </nav>
      </div>

      <div className="relative aspect-[16/8]">
        <Image
          src={`https://images.unsplash.com/${GALLERY_SHOWCASE_IMAGES[0]!.src}?w=1200&q=70&auto=format&fit=crop`}
          alt={GALLERY_SHOWCASE_IMAGES[0]!.alt}
          fill
          sizes="800px"
          className="object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-center">
          <p className="font-display text-xl italic sm:text-3xl">Amara Wren</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
            Wedding &amp; Portrait Photography
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-1.5">
        {PREVIEW_IMAGES.map((image) => (
          <div key={image.src} className="relative aspect-[3/4] overflow-hidden">
            <Image
              src={`https://images.unsplash.com/${image.src}?w=400&q=65&auto=format&fit=crop`}
              alt={image.alt}
              fill
              sizes="200px"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs font-medium">Custom domain connected</p>
          <p className="font-mono text-[11px] text-white/45">amarawren.com</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-white/20"
        >
          Book a session
        </button>
      </div>
    </div>
  )
}

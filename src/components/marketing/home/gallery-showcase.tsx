import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GALLERY_SHOWCASE_IMAGES } from '@/lib/constants/homepage'
import { ScrollReveal } from './lib/scroll-reveal'

const FILMSTRIP_IMAGES = GALLERY_SHOWCASE_IMAGES

export function GalleryShowcase() {
  return (
    <section className="relative overflow-hidden bg-[#0c0c0f] py-24 sm:py-32">
      <div className="absolute inset-0 opacity-30">
        <Image
          src={`https://images.unsplash.com/${FILMSTRIP_IMAGES[3]!.src}?w=2000&q=60&auto=format&fit=crop`}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0f] via-[#0c0c0f]/80 to-[#0c0c0f]" />
      </div>

      <div className="container-wide relative">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-white/50">
              The gallery experience
            </span>
            <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              The gallery is part of the experience.
            </h2>
            <p className="mt-4 text-lg text-white/60">
              Give clients a beautiful place to discover, select, share, and download their images.
            </p>
            <Link
              href="/features/galleries"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-white link-underline"
            >
              Explore galleries
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </ScrollReveal>
      </div>

      <ScrollReveal variant="fadeIn" delay={0.15} className="relative mt-16">
        <div className="scrollbar-hide hidden gap-4 overflow-x-auto px-[max(1.5rem,calc((100vw-80rem)/2))] pb-4 sm:flex">
          {FILMSTRIP_IMAGES.map((image, index) => (
            <div
              key={image.src}
              className="relative aspect-[4/5] w-[220px] shrink-0 overflow-hidden rounded-lg lg:w-[280px]"
              style={{ marginTop: index % 2 === 0 ? 0 : 32 }}
            >
              <Image
                src={`https://images.unsplash.com/${image.src}?w=700&q=75&auto=format&fit=crop`}
                alt={image.alt}
                fill
                sizes="280px"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        <div className="container-wide grid grid-cols-2 gap-3 sm:hidden">
          {FILMSTRIP_IMAGES.slice(0, 4).map((image) => (
            <div key={image.src} className="relative aspect-[3/4] overflow-hidden rounded-lg">
              <Image
                src={`https://images.unsplash.com/${image.src}?w=500&q=70&auto=format&fit=crop`}
                alt={image.alt}
                fill
                sizes="50vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  )
}

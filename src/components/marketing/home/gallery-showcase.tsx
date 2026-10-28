import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GALLERY_SHOWCASE_IMAGES } from '@/lib/constants/homepage'
import { SectionHead } from './lib/section-head'
import { ScrollReveal } from './lib/scroll-reveal'

const FILMSTRIP_IMAGES = GALLERY_SHOWCASE_IMAGES

export function GalleryShowcase() {
  return (
    <section className="page-section overflow-hidden">
      <div className="container-wide">
        <SectionHead
          title="The gallery is part of the experience."
          caption="The gallery experience"
          intro="Give clients a beautiful place to discover, select, share, and download their images."
        />
        <Link
          href="/features/galleries"
          className="focus-ring mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary link-underline"
        >
          Explore galleries
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ScrollReveal variant="fadeIn" delay={0.15} className="relative mt-12">
        <div className="scrollbar-hide hidden gap-4 overflow-x-auto px-[max(1.5rem,calc((100vw-80rem)/2))] pb-4 sm:flex">
          {FILMSTRIP_IMAGES.map((image, index) => (
            <div
              key={image.src}
              className="relative aspect-[4/5] w-[220px] shrink-0 overflow-hidden rounded-md border border-border bg-muted lg:w-[280px]"
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

        {/* Mobile: a full grid of all 8 images rather than hiding half the set. */}
        <div className="container-wide grid grid-cols-2 gap-3 sm:hidden">
          {FILMSTRIP_IMAGES.map((image) => (
            <div
              key={image.src}
              className="relative aspect-[3/4] overflow-hidden rounded-md border border-border bg-muted"
            >
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

        <p className="label-caption container-wide mt-4 sm:text-right">Example imagery</p>
      </ScrollReveal>
    </section>
  )
}

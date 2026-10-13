import { Calendar, Images, User } from 'lucide-react'
import { headingFontClass, type HeadingFont } from '@/components/galleries/GalleryCoverPreview'
import { cn } from '@/lib/utils'

interface GalleryHeroProps {
  title: string
  eyebrow: string
  description?: string
  clientName?: string
  dateLabel?: string
  photoCount: number
  coverImageUrl?: string
  headingFont?: HeadingFont
}

// Editorial titles break before the last word ("Nelly Graduation / Shoot")
// rather than wrapping wherever the viewport happens to cut. Two-word titles
// stay together so a short name doesn't get stranded on two lines.
function splitTitle(title: string): [string, string | null] {
  const words = title.trim().split(/\s+/)
  if (words.length < 3) return [title.trim(), null]
  return [words.slice(0, -1).join(' '), words[words.length - 1] ?? null]
}

export function GalleryHero({
  title,
  eyebrow,
  description,
  clientName,
  dateLabel,
  photoCount,
  coverImageUrl,
  headingFont,
}: GalleryHeroProps) {
  const [lead, tail] = splitTitle(title)

  return (
    <section className="border-b border-border" aria-labelledby="gallery-title">
      <div className={cn('mx-auto grid max-w-[1600px]', coverImageUrl && 'lg:grid-cols-12')}>
        {coverImageUrl && (
          <div className="relative order-1 aspect-[4/3] overflow-hidden bg-muted sm:aspect-[16/10] lg:order-2 lg:col-span-7 lg:aspect-auto lg:min-h-[560px]">
            {/* The one LCP image on the page: eager + high priority. Plain <img>
                because cover URLs may come from hosts outside next/image's
                remotePatterns, and the stored cover is already a sized variant. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Readability only where text meets image; the photo stays clean. */}
            <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-background via-background/0 to-transparent lg:block" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent lg:hidden" />
          </div>
        )}

        <div
          className={cn(
            'order-2 flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-14 lg:order-1 lg:px-12 lg:py-20',
            coverImageUrl ? 'lg:col-span-5' : 'items-start',
          )}
        >
          <div className="gv-fade-up flex items-center gap-3">
            <span className="h-px w-10" style={{ backgroundColor: 'var(--brand-color, hsl(var(--gv-accent)))' }} aria-hidden="true" />
            <p className="label-caption">{eyebrow}</p>
          </div>

          <h1
            id="gallery-title"
            className={cn(headingFontClass(headingFont), 'gv-fade-up mt-5 text-display-xl [animation-delay:60ms]')}
          >
            {lead}
            {tail && (
              <>
                {' '}
                <span className="block">{tail}</span>
              </>
            )}
          </h1>

          <dl className="gv-fade-up mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm text-muted-foreground [animation-delay:120ms]">
            {dateLabel && (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Date</dt>
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <dd>{dateLabel}</dd>
              </div>
            )}
            <div className="flex items-center gap-2">
              <dt className="sr-only">Photos</dt>
              <Images className="h-4 w-4" aria-hidden="true" />
              <dd>
                {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
              </dd>
            </div>
            {clientName && (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Client</dt>
                <User className="h-4 w-4" aria-hidden="true" />
                <dd>{clientName}</dd>
              </div>
            )}
          </dl>

          {description && (
            <p className="gv-fade-up mt-6 max-w-prose whitespace-pre-line text-body text-muted-foreground [animation-delay:180ms]">
              {description}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

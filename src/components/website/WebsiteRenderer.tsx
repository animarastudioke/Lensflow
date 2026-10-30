import Link from 'next/link'
import { Eye } from 'lucide-react'
import { getWebsiteSections, type WebsiteGalleryOption, type WebsiteSection } from '@/lib/website/content'

export interface WebsiteRendererNavItem {
  name: string
  path: string
}

export interface WebsiteRendererProps {
  studioName: string
  logoUrl?: string | null
  websiteName: string
  template?: string
  primaryColor?: string | null
  navPages: WebsiteRendererNavItem[]
  currentPath: string
  page: {
    name: string
    content: unknown
  }
  galleryOptions?: WebsiteGalleryOption[]
  /** Route prefix nav links are built from -- the public route or the authenticated preview route. */
  basePath: string
  /** True only for the authenticated, studio-member-only preview route. */
  preview?: boolean
  previewLabel?: string
  previewLinksInNewTab?: boolean
}

function pageHref(basePath: string, path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.length === 0 ? basePath : `${basePath}/${segments.join('/')}`
}

function findGallery(galleries: WebsiteGalleryOption[], galleryId?: string) {
  return galleryId ? galleries.find((gallery) => gallery.id === galleryId) : undefined
}

function ActionLink({ href, label, primaryColor, dark }: {
  href?: string
  label?: string
  primaryColor?: string | null
  dark: boolean
}) {
  if (!href || !label) return null

  const className = dark
    ? 'inline-flex items-center rounded-sm bg-white px-5 py-3 text-sm font-medium text-stone-950 hover:bg-white/90'
    : 'inline-flex items-center rounded-sm px-5 py-3 text-sm font-medium text-white hover:opacity-90'

  if (/^https:\/\//i.test(href)) {
    return <a className={className} style={!dark && primaryColor ? { backgroundColor: primaryColor } : undefined} href={href} target="_blank" rel="noopener noreferrer">{label}</a>
  }

  if (href.startsWith('mailto:') || href.startsWith('tel:')) {
    return <a className={className} style={!dark && primaryColor ? { backgroundColor: primaryColor } : undefined} href={href}>{label}</a>
  }

  return <Link className={className} style={!dark && primaryColor ? { backgroundColor: primaryColor } : undefined} href={href}>{label}</Link>
}

function SectionView({
  section,
  galleries,
  primaryColor,
  template,
  preview,
}: {
  section: WebsiteSection
  galleries: WebsiteGalleryOption[]
  primaryColor?: string | null
  template: string
  preview: boolean
}) {
  const dark = template === 'bold-editorial'
  const gallery = 'galleryId' in section ? findGallery(galleries, section.galleryId) : undefined
  const sectionHeadingClass = `text-3xl font-display font-semibold tracking-tight md:text-4xl ${dark ? 'text-white' : 'text-stone-950'}`
  const sectionBodyClass = `mt-4 max-w-2xl whitespace-pre-wrap text-base leading-7 ${dark ? 'text-white/70' : 'text-stone-600'}`

  if (section.type === 'hero') {
    const heroImage = gallery?.images[0]
    return (
      <section id={section.id} className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:px-10 md:py-24">
        <div>
          {section.eyebrow && <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{section.eyebrow}</p>}
          <h2 className={`text-4xl font-display font-semibold leading-[1.08] tracking-tight md:text-6xl ${dark ? 'text-white' : 'text-stone-950'}`} style={primaryColor ? { textDecorationColor: primaryColor } : undefined}>{section.heading}</h2>
          {section.body && <p className={sectionBodyClass}>{section.body}</p>}
          <div className="mt-7">
            <ActionLink href={section.ctaHref} label={section.ctaLabel} primaryColor={primaryColor} dark={dark} />
          </div>
        </div>
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage.src} alt={heroImage.alt} className="aspect-[4/5] w-full rounded-sm object-cover" />
        )}
      </section>
    )
  }

  if (section.type === 'gallery') {
    if (!gallery && !preview) return null
    return (
      <section id={section.id} className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20">
        <h2 className={sectionHeadingClass}>{section.heading}</h2>
        {gallery ? (
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
            {gallery.images.map((image, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${gallery.id}-${index}`} src={image.src} alt={image.alt} loading="lazy" className="aspect-[4/5] w-full rounded-sm object-cover" />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-sm border border-dashed border-stone-300 p-6 text-sm text-stone-500">Choose one of your published galleries to show its photographs here.</p>
        )}
      </section>
    )
  }

  if (section.type === 'services') {
    if (section.items.length === 0 && !preview) return null
    return (
      <section id={section.id} className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20">
        <h2 className={sectionHeadingClass}>{section.heading}</h2>
        {section.items.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item, index) => (
              <article key={`${section.id}-${index}`} className={`rounded-sm border p-6 ${dark ? 'border-white/15 bg-white/5' : 'border-stone-200 bg-white/70'}`}>
                <h3 className="font-display text-lg font-semibold" style={primaryColor ? { color: primaryColor } : undefined}>{item.title}</h3>
                {item.description && <p className={`mt-2 text-sm leading-6 ${dark ? 'text-white/65' : 'text-stone-600'}`}>{item.description}</p>}
              </article>
            ))}
          </div>
        ) : preview ? (
          <p className="mt-5 rounded-sm border border-dashed border-stone-300 p-6 text-sm text-stone-500">Add your packages or services to show them here.</p>
        ) : null}
      </section>
    )
  }

  if (section.type === 'contact') {
    return (
      <section id={section.id || 'contact'} className={`mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24 ${dark ? 'bg-white/5' : 'bg-stone-100'}`}>
        <h2 className={sectionHeadingClass}>{section.heading}</h2>
        {section.body && <p className={sectionBodyClass}>{section.body}</p>}
        <div className="mt-7">
          <ActionLink href={section.ctaHref} label={section.ctaLabel} primaryColor={primaryColor} dark={dark} />
        </div>
      </section>
    )
  }

  return (
    <section id={section.id} className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20">
      <h2 className={sectionHeadingClass} style={primaryColor ? { color: primaryColor } : undefined}>{section.heading}</h2>
      {section.body && <p className={sectionBodyClass}>{section.body}</p>}
    </section>
  )
}

export function WebsiteRenderer({
  studioName,
  logoUrl,
  websiteName,
  template = 'modern-minimal',
  primaryColor,
  navPages,
  currentPath,
  page,
  galleryOptions = [],
  basePath,
  preview = false,
  previewLabel,
  previewLinksInNewTab = false,
}: WebsiteRendererProps) {
  const sections = getWebsiteSections(page.content, page.name)
  const dark = template === 'bold-editorial'
  const siteClass = template === 'elegant-wedding'
    ? 'bg-[#fbf8f3] text-stone-800'
    : dark
      ? 'bg-[#171717] text-white'
      : 'bg-white text-stone-900'

  return (
    <div className={`min-h-screen ${siteClass} ${template === 'elegant-wedding' ? 'font-serif' : ''}`}>
      {preview && (
        <div className="sticky top-0 z-10 flex items-center justify-center gap-2 border-b border-border bg-muted/95 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{previewLabel ?? 'Preview of your saved draft — this is not the live public page.'}</span>
        </div>
      )}

      <header className={`border-b ${dark ? 'border-white/10' : 'border-stone-200'}`}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5 md:px-10">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={studioName} className="h-11 w-11 rounded-full object-cover" />
          )}
          <div className="min-w-0">
            <p className={`font-display text-lg font-semibold ${dark ? 'text-white' : 'text-stone-900'}`}>{studioName}</p>
            {websiteName !== studioName && <p className={`text-xs ${dark ? 'text-white/55' : 'text-stone-500'}`}>{websiteName}</p>}
          </div>
        </div>
        {navPages.length > 1 && (
          <nav aria-label="Website pages" className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-6 pb-4 md:px-10">
            {navPages.map((nav) => {
              const isActive = nav.path === currentPath
              return (
                <Link key={nav.path} href={pageHref(basePath, nav.path)} target={previewLinksInNewTab ? '_blank' : undefined} rel={previewLinksInNewTab ? 'noopener noreferrer' : undefined} aria-current={isActive ? 'page' : undefined}
                  className={`border-b-2 pb-1 text-sm ${isActive ? 'font-medium' : dark ? 'border-transparent text-white/60 hover:text-white' : 'border-transparent text-stone-500 hover:text-stone-900'}`}
                  style={isActive ? { borderColor: primaryColor || (dark ? '#fff' : '#292524'), color: dark ? '#fff' : undefined } : undefined}>
                  {nav.name}
                </Link>
              )
            })}
          </nav>
        )}
      </header>

      <main>
        {sections.map((section) => (
          <SectionView key={section.id} section={section} galleries={galleryOptions} primaryColor={primaryColor} template={template} preview={preview} />
        ))}
      </main>

      <footer className={`mx-auto max-w-6xl border-t px-6 py-8 text-xs md:px-10 ${dark ? 'border-white/10 text-white/50' : 'border-stone-200 text-stone-500'}`}>
        {studioName}{websiteName !== studioName ? ` · ${websiteName}` : ''}
      </footer>
    </div>
  )
}


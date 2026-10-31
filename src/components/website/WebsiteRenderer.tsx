import Link from 'next/link'
import { Eye } from 'lucide-react'
import { getTemplate, type TemplateTheme } from '@/lib/website/templates'
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

function ActionLink({ href, label, primaryColor, theme }: {
  href?: string
  label?: string
  primaryColor?: string | null
  theme: TemplateTheme
}) {
  if (!href || !label) return null

  const dark = theme.dark
  const className = dark
    ? `inline-flex items-center ${theme.radius} bg-white px-5 py-3 text-sm font-medium text-stone-950 hover:bg-white/90`
    : `inline-flex items-center ${theme.radius} px-5 py-3 text-sm font-medium text-white hover:opacity-90`

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
  theme,
  preview,
}: {
  section: WebsiteSection
  galleries: WebsiteGalleryOption[]
  primaryColor?: string | null
  theme: TemplateTheme
  preview: boolean
}) {
  const gallery = 'galleryId' in section ? findGallery(galleries, section.galleryId) : undefined
  const sectionHeadingClass = `text-3xl ${theme.display} ${theme.tracking} md:text-4xl ${theme.heading}`
  const centered = theme.heroLayout === 'centered'
  const sectionBodyClass = `mt-4 max-w-2xl whitespace-pre-wrap text-base leading-7 ${theme.body}`
  const heroBodyClass = centered ? `${sectionBodyClass} mx-auto` : sectionBodyClass

  if (section.type === 'hero') {
    const heroImage = gallery?.images[0]
    return (
      <section id={section.id} className={`mx-auto grid ${theme.maxWidth} gap-10 px-6 ${theme.padHero} md:px-10 ${centered ? 'justify-items-center text-center' : 'md:grid-cols-2 md:items-center'}`}>
        <div>
          {section.eyebrow && <p className={`mb-4 text-xs font-semibold uppercase tracking-[0.2em] ${theme.eyebrow}`}>{section.eyebrow}</p>}
          <h2 className={`text-4xl ${theme.display} leading-[1.08] ${theme.tracking} md:text-6xl ${theme.heading}`} style={primaryColor ? { textDecorationColor: primaryColor } : undefined}>{section.heading}</h2>
          {section.body && <p className={heroBodyClass}>{section.body}</p>}
          <div className="mt-7">
            <ActionLink href={section.ctaHref} label={section.ctaLabel} primaryColor={primaryColor} theme={theme} />
          </div>
        </div>
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage.src} alt={heroImage.alt} className={`${theme.heroImage} ${theme.radius} object-cover`} />
        )}
      </section>
    )
  }

  if (section.type === 'gallery') {
    if (!gallery && !preview) return null
    return (
      <section id={section.id} className={`mx-auto ${theme.maxWidth} px-6 ${theme.padSection} md:px-10`}>
        <h2 className={sectionHeadingClass}>{section.heading}</h2>
        {gallery ? (
          <div className={`mt-8 grid ${theme.galleryGrid}`}>
            {gallery.images.map((image, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${gallery.id}-${index}`} src={image.src} alt={image.alt} loading="lazy" className={`${theme.galleryImage} ${theme.radius} object-cover`} />
            ))}
          </div>
        ) : (
          <p className={`mt-5 ${theme.radius} border border-dashed ${theme.emptyNote} p-6 text-sm`}>Choose one of your published galleries to show its photographs here.</p>
        )}
      </section>
    )
  }

  if (section.type === 'services') {
    if (section.items.length === 0 && !preview) return null
    return (
      <section id={section.id} className={`mx-auto ${theme.maxWidth} px-6 ${theme.padSection} md:px-10`}>
        <h2 className={sectionHeadingClass}>{section.heading}</h2>
        {section.items.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item, index) => (
              <article key={`${section.id}-${index}`} className={`${theme.radius} border p-6 ${theme.card}`}>
                <h3 className={theme.cardTitle} style={primaryColor ? { color: primaryColor } : undefined}>{item.title}</h3>
                {item.description && <p className={`mt-2 text-sm leading-6 ${theme.cardText}`}>{item.description}</p>}
              </article>
            ))}
          </div>
        ) : preview ? (
          <p className={`mt-5 ${theme.radius} border border-dashed ${theme.emptyNote} p-6 text-sm`}>Add your packages or services to show them here.</p>
        ) : null}
      </section>
    )
  }

  if (section.type === 'contact') {
    return (
      <section id={section.id || 'contact'} className={`mx-auto ${theme.maxWidth} px-6 ${theme.padContact} md:px-10 ${theme.contactBg}`}>
        <h2 className={sectionHeadingClass}>{section.heading}</h2>
        {section.body && <p className={sectionBodyClass}>{section.body}</p>}
        <div className="mt-7">
          <ActionLink href={section.ctaHref} label={section.ctaLabel} primaryColor={primaryColor} theme={theme} />
        </div>
      </section>
    )
  }

  return (
    <section id={section.id} className={`mx-auto ${theme.maxWidth} px-6 ${theme.padSection} md:px-10`}>
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
  // Unknown/retired ids resolve to the default look rather than failing.
  const theme = getTemplate(template).theme
  const dark = theme.dark

  return (
    <div className={`min-h-screen ${theme.site}`}>
      {preview && (
        <div className="sticky top-0 z-10 flex items-center justify-center gap-2 border-b border-border bg-muted/95 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{previewLabel ?? 'Preview of your saved draft — this is not the live public page.'}</span>
        </div>
      )}

      <header className={`border-b ${theme.headerBorder}`}>
        <div className={`mx-auto flex ${theme.maxWidth} items-center gap-4 px-6 py-5 md:px-10`}>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={studioName} className="h-11 w-11 rounded-full object-cover" />
          )}
          <div className="min-w-0">
            <p className={`${theme.cardTitle} ${theme.studioName}`}>{studioName}</p>
            {websiteName !== studioName && <p className={`text-xs ${theme.siteName}`}>{websiteName}</p>}
          </div>
        </div>
        {navPages.length > 1 && (
          <nav aria-label="Website pages" className={`mx-auto flex ${theme.maxWidth} flex-wrap gap-x-6 gap-y-2 px-6 pb-4 md:px-10`}>
            {navPages.map((nav) => {
              const isActive = nav.path === currentPath
              return (
                <Link key={nav.path} href={pageHref(basePath, nav.path)} target={previewLinksInNewTab ? '_blank' : undefined} rel={previewLinksInNewTab ? 'noopener noreferrer' : undefined} aria-current={isActive ? 'page' : undefined}
                  className={`border-b-2 pb-1 text-sm ${isActive ? 'font-medium' : theme.navIdle}`}
                  style={isActive ? { borderColor: primaryColor || theme.navActiveFallback, color: dark ? '#fff' : undefined } : undefined}>
                  {nav.name}
                </Link>
              )
            })}
          </nav>
        )}
      </header>

      <main>
        {sections.map((section) => (
          <SectionView key={section.id} section={section} galleries={galleryOptions} primaryColor={primaryColor} theme={theme} preview={preview} />
        ))}
      </main>

      <footer className={`mx-auto ${theme.maxWidth} border-t px-6 py-8 text-xs md:px-10 ${theme.footer}`}>
        {studioName}{websiteName !== studioName ? ` · ${websiteName}` : ''}
      </footer>
    </div>
  )
}


import Link from 'next/link'
import { Eye } from 'lucide-react'

export interface WebsiteRendererNavItem {
  name: string
  path: string
}

export interface WebsiteRendererProps {
  studioName: string
  logoUrl?: string | null
  websiteName: string
  primaryColor?: string | null
  navPages: WebsiteRendererNavItem[]
  currentPath: string
  page: {
    name: string
    content: { heading?: string; body?: string }
  }
  /** Route prefix nav links are built from -- the public `/portfolio/{subdomain}`
   *  route for real visitors, or the authenticated `/preview` route while editing. */
  basePath: string
  /** True only for the authenticated, studio-member-only preview route. */
  preview?: boolean
}

function pageHref(basePath: string, path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.length === 0 ? basePath : `${basePath}/${segments.join('/')}`
}

/**
 * The one renderer for a website page, shared by the public
 * `/portfolio/[subdomain]` route and the authenticated studio-member
 * preview route (Phase 11 Step 8) -- so "preview" can never drift from what
 * a real visitor sees. Deliberately plain: `content` is a single
 * heading/body pair (see updateWebsitePageContent), not a section/block
 * model, so there is nothing here to fake into looking like a page builder.
 */
export function WebsiteRenderer({
  studioName,
  logoUrl,
  websiteName,
  primaryColor,
  navPages,
  currentPath,
  page,
  basePath,
  preview = false,
}: WebsiteRendererProps) {
  const accent = primaryColor || undefined

  return (
    <div className="min-h-screen bg-background">
      {preview && (
        <div className="flex items-center justify-center gap-2 border-b border-border bg-muted/60 px-4 py-2 text-sm text-muted-foreground">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Preview of your saved draft &mdash; this is not the live public page.</span>
        </div>
      )}

      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-8 flex items-center gap-4">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={studioName} className="h-12 w-12 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-display-md font-display font-semibold text-foreground">{studioName}</h1>
            {websiteName !== studioName && (
              <p className="text-body-sm text-muted-foreground">{websiteName}</p>
            )}
          </div>
        </div>
        {navPages.length > 1 && (
          <nav className="max-w-3xl mx-auto px-4 pb-4 flex flex-wrap gap-x-5 gap-y-1">
            {navPages.map((nav) => {
              const isActive = nav.path === currentPath
              return (
                <Link
                  key={nav.path}
                  href={pageHref(basePath, nav.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={
                    isActive
                      ? 'text-sm font-medium text-foreground border-b-2'
                      : 'text-sm text-muted-foreground hover:text-foreground'
                  }
                  style={isActive && accent ? { borderColor: accent } : undefined}
                >
                  {nav.name}
                </Link>
              )
            })}
          </nav>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {page.content.heading ? (
          <h2
            className="text-display-sm font-display font-semibold text-foreground mb-4"
            style={accent ? { color: accent } : undefined}
          >
            {page.content.heading}
          </h2>
        ) : (
          <h2 className="text-display-sm font-display font-semibold text-foreground mb-4">{page.name}</h2>
        )}

        {page.content.body ? (
          <p className="text-body text-muted-foreground whitespace-pre-wrap leading-relaxed">{page.content.body}</p>
        ) : (
          <p className="text-body text-muted-foreground italic">This page doesn&apos;t have content yet.</p>
        )}
      </main>
    </div>
  )
}

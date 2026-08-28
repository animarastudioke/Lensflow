'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasEntitlement } from '@/lib/entitlements'

export interface PublicWebsitePageContent {
  heading?: string
  body?: string
}

export interface PublicWebsiteNavItem {
  name: string
  path: string
}

export interface PublicWebsiteResult {
  studioName: string
  logoUrl: string | null
  websiteName: string
  primaryColor: string | null
  seoTitle: string | null
  seoDescription: string | null
  navPages: PublicWebsiteNavItem[]
  page: {
    name: string
    path: string
    content: PublicWebsitePageContent
  }
}

/**
 * Resolves a published page of a published website for the public
 * `/portfolio/[subdomain]` route. Uses the service-role client the same
 * way getPublicStore() (src/lib/actions/storefront.ts) does for the public
 * store route -- an unauthenticated visitor has no session for RLS to key
 * off, so the "published" and "is_published" filters are re-applied here in
 * application code, matching exactly what the "Public can view published
 * websites" / "...pages of published websites" RLS policies already
 * describe as public.
 *
 * `password_protected` websites are deliberately excluded rather than
 * served: the app has no flow anywhere that ever collects and hashes an
 * actual password for a website (only the on/off flag persists), so there
 * is nothing to verify a visitor against. Serving the site while claiming
 * "password protected" would be a false sense of security; not serving it
 * at all is the safe default until real verification is built (see
 * WebsiteEditor's inline note next to the checkbox).
 */
export async function getPublicWebsitePage(subdomain: string, path: string): Promise<PublicWebsiteResult | null> {
  const { data: website } = await supabaseAdmin
    .from('websites')
    .select('id, studio_id, name, status, theme, seo, password_protected')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (!website || website.status !== 'published' || website.password_protected) return null

  const entitled = await hasEntitlement(website.studio_id, 'website_builder')
  if (!entitled) return null

  const { data: studio } = await supabaseAdmin
    .from('studios')
    .select('name, logo_url')
    .eq('id', website.studio_id)
    .single()

  const { data: pages } = await supabaseAdmin
    .from('website_pages')
    .select('name, path, content')
    .eq('website_id', website.id)
    .eq('is_published', true)
    .order('order', { ascending: true })

  const publishedPages = pages ?? []
  const page = publishedPages.find((p) => p.path === path)
  if (!page) return null

  const theme = website.theme as { primaryColor?: string } | null
  const seo = website.seo as { title?: string; description?: string } | null

  return {
    studioName: studio?.name ?? website.name,
    logoUrl: studio?.logo_url ?? null,
    websiteName: website.name,
    primaryColor: theme?.primaryColor ?? null,
    seoTitle: seo?.title ?? null,
    seoDescription: seo?.description ?? null,
    navPages: publishedPages.map((p) => ({ name: p.name, path: p.path })),
    page: {
      name: page.name,
      path: page.path,
      content: (page.content ?? {}) as PublicWebsitePageContent,
    },
  }
}

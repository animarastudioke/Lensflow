'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasEntitlement } from '@/lib/entitlements'
import { getWebsiteSections, type WebsiteGalleryOption } from '@/lib/website/content'
import { getWebsiteGalleryOptions } from '@/lib/website/galleries'
import { buildNavItems, filterVisiblePages } from '@/lib/website/page-tree'

export interface PublicWebsiteNavItem {
  name: string
  path: string
  children?: { name: string; path: string }[]
}

export interface PublicWebsiteResult {
  studioName: string
  logoUrl: string | null
  websiteName: string
  template: string
  primaryColor: string | null
  seoTitle: string | null
  seoDescription: string | null
  navPages: PublicWebsiteNavItem[]
  page: {
    name: string
    path: string
    content: { sections: ReturnType<typeof getWebsiteSections> }
  }
  galleryOptions: WebsiteGalleryOption[]
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
 * the builder's inline note next to the checkbox).
 */
export async function getPublicWebsitePage(subdomain: string, path: string, includeGalleryImages = true): Promise<PublicWebsiteResult | null> {
  const { data: website } = await supabaseAdmin
    .from('websites')
    .select('id, studio_id, name, status, template, theme, seo, password_protected')
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
    .select('id, name, path, order, is_published, content')
    .eq('website_id', website.id)
    .order('order', { ascending: true })

  // Drafts are read too, only so a sub-page can be hidden along with its
  // parent; nothing unpublished is ever served or listed.
  const publishedPages = filterVisiblePages(pages ?? [])
  const page = publishedPages.find((p) => p.path === path)
  if (!page) return null

  const sections = getWebsiteSections(page.content, page.name)
  const galleryIds = [...new Set(sections.flatMap((section) =>
    'galleryId' in section && section.galleryId ? [section.galleryId] : []
  ))]
  const galleryOptions = includeGalleryImages
    ? await getWebsiteGalleryOptions(supabaseAdmin, website.studio_id, galleryIds)
    : []

  const theme = website.theme as { primaryColor?: string } | null
  const seo = website.seo as { title?: string; description?: string } | null

  return {
    studioName: studio?.name ?? website.name,
    logoUrl: studio?.logo_url ?? null,
    websiteName: website.name,
    template: website.template,
    primaryColor: theme?.primaryColor ?? null,
    seoTitle: seo?.title ?? null,
    seoDescription: seo?.description ?? null,
    navPages: buildNavItems(publishedPages),
    page: {
      name: page.name,
      path: page.path,
      content: { sections },
    },
    galleryOptions,
  }
}


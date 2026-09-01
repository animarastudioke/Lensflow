import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getWebsite } from '@/lib/actions/websites'
import { WebsiteRenderer } from '@/components/website/WebsiteRenderer'

interface WebsitePreviewPageProps {
  params: Promise<{ studioSlug: string; websiteId: string; path?: string[] }>
}

function resolvePath(segments?: string[]): string {
  return '/' + (segments ?? []).join('/')
}

export async function generateMetadata({ params }: WebsitePreviewPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Preview - ${studioSlug}`,
    robots: { index: false, follow: false },
  }
}

/**
 * Authenticated preview of a page's saved (not necessarily published)
 * content, using the exact same WebsiteRenderer the real public
 * `/portfolio/[subdomain]` route uses -- so preview can never show
 * something a real visitor wouldn't also see once published. getWebsite()
 * resolves the website through the caller's own RLS-scoped session (same
 * as the editor/analytics pages), so a user with no membership in this
 * studio gets no row back regardless of what websiteId/studioSlug they
 * type in the URL -- no separate authorization check is added here.
 */
export default async function WebsitePreviewPage({ params }: WebsitePreviewPageProps) {
  const { studioSlug, websiteId, path } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const website = await getWebsite(websiteId, studioSlug)
  if (!website) {
    notFound()
  }

  const resolvedPath = resolvePath(path)
  const page = (website.pages ?? []).find((p) => p.path === resolvedPath)
  if (!page) {
    notFound()
  }

  return (
    <WebsiteRenderer
      studioName={website.name}
      logoUrl={null}
      websiteName={website.name}
      primaryColor={website.theme?.primaryColor}
      navPages={(website.pages ?? []).map((p) => ({ name: p.name, path: p.path }))}
      currentPath={page.path}
      page={{ name: page.name, content: page.content as { heading?: string; body?: string } }}
      basePath={`/dashboard/${studioSlug}/website/${websiteId}/preview`}
      preview
    />
  )
}

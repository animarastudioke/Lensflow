import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicWebsitePage } from '@/lib/actions/public-website'
import { WebsiteRenderer } from '@/components/website/WebsiteRenderer'

interface PublicWebsitePageProps {
  params: Promise<{ subdomain: string; path?: string[] }>
}

function resolvePath(segments?: string[]): string {
  return '/' + (segments ?? []).join('/')
}

export async function generateMetadata({ params }: PublicWebsitePageProps): Promise<Metadata> {
  const { subdomain, path } = await params
  const result = await getPublicWebsitePage(subdomain, resolvePath(path))
  if (!result) return { title: 'Site not found' }
  return {
    title: result.seoTitle || `${result.websiteName} — ${result.studioName}`,
    description: result.seoDescription || undefined,
  }
}

export default async function PublicWebsitePage({ params }: PublicWebsitePageProps) {
  const { subdomain, path } = await params
  const result = await getPublicWebsitePage(subdomain, resolvePath(path))

  if (!result) {
    notFound()
  }

  return (
    <WebsiteRenderer
      studioName={result.studioName}
      logoUrl={result.logoUrl}
      websiteName={result.websiteName}
      primaryColor={result.primaryColor}
      navPages={result.navPages}
      currentPath={result.page.path}
      page={result.page}
      basePath={`/portfolio/${subdomain}`}
    />
  )
}

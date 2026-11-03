import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { WebsiteBuilder } from '@/components/website/builder/WebsiteBuilder'
import { getWebsite, getWebsiteGalleries } from '@/lib/actions/websites'

interface WebsiteEditorPageProps {
  params: Promise<{ studioSlug: string; websiteId: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({
  params,
}: WebsiteEditorPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Edit Website - ${studioSlug}`,
    description: 'Edit your portfolio website',
  }
}

export default async function WebsiteEditorPage({ params, searchParams }: WebsiteEditorPageProps) {
  const { studioSlug, websiteId } = await params
  const { page: requestedPageId } = await searchParams
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [website, galleries] = await Promise.all([
    getWebsite(websiteId, studioSlug),
    getWebsiteGalleries(websiteId, studioSlug),
  ])

  if (!website) {
    notFound()
  }

  // The id only picks which page opens first; an unknown one is ignored by the builder.
  const initialPageId = website.pages?.some((page) => page.id === requestedPageId) ? requestedPageId : undefined

  return <WebsiteBuilder studioSlug={studioSlug} website={website} galleries={galleries} initialPageId={initialPageId} />
}

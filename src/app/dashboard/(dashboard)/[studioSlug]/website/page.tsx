import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { WebsiteList } from '@/components/website/WebsiteList'
import { getWebsites } from '@/lib/actions/websites'

interface WebsitePageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({
  params,
}: WebsitePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Website - ${studioSlug}`,
    description: 'Manage your portfolio website',
  }
}

export default async function WebsitePage({ params }: WebsitePageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const { websites } = await getWebsites(studioSlug)

  return <WebsiteList studioSlug={studioSlug} initialWebsites={websites} />
}
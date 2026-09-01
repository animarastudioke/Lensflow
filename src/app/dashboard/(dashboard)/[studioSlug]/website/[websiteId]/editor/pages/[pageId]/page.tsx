import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { WebsitePageEditor } from '@/components/website/WebsitePageEditor'
import { getWebsitePage } from '@/lib/actions/websites'

interface WebsitePageEditorPageProps {
  params: Promise<{ studioSlug: string; websiteId: string; pageId: string }>
}

export async function generateMetadata({ params }: WebsitePageEditorPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Edit Page - ${studioSlug}`,
    description: 'Edit a page on your portfolio website',
  }
}

export default async function WebsitePageEditorPage({ params }: WebsitePageEditorPageProps) {
  const { studioSlug, websiteId, pageId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const result = await getWebsitePage(pageId, websiteId, studioSlug)

  if (!result) {
    notFound()
  }

  return (
    <WebsitePageEditor
      studioSlug={studioSlug}
      websiteId={websiteId}
      websiteName={result.website.name}
      page={result.page}
    />
  )
}

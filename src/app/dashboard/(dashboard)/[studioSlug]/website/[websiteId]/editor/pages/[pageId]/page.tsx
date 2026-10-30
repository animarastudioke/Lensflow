import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { WebsitePageEditor } from '@/components/website/WebsitePageEditor'
import { getWebsiteGalleries, getWebsitePage } from '@/lib/actions/websites'

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

  const [result, galleries] = await Promise.all([
    getWebsitePage(pageId, websiteId, studioSlug),
    getWebsiteGalleries(websiteId, studioSlug),
  ])

  if (!result) {
    notFound()
  }

  return (
    <WebsitePageEditor
      studioSlug={studioSlug}
      websiteId={websiteId}
      websiteName={result.website.name}
      studioName={result.website.studio?.name ?? result.website.name}
      logoUrl={result.website.studio?.logo_url}
      template={result.website.template}
      primaryColor={result.website.theme?.primaryColor}
      navPages={[...(result.website.pages ?? [])].filter((item) => item.is_published).sort((a, b) => a.order - b.order).map((item) => ({ name: item.name, path: item.path }))}
      galleries={galleries}
      page={result.page}
    />
  )
}


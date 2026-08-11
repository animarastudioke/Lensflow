import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { WebsiteEditor } from '@/components/website/WebsiteEditor'
import { getWebsite } from '@/lib/actions/websites'

interface WebsiteEditorPageProps {
  params: Promise<{ studioSlug: string; websiteId: string }>
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

export default async function WebsiteEditorPage({ params }: WebsiteEditorPageProps) {
  const { studioSlug, websiteId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const website = await getWebsite(websiteId, studioSlug)

  if (!website) {
    notFound()
  }

  return <WebsiteEditor studioSlug={studioSlug} website={website} />
}

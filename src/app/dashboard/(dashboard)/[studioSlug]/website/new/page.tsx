import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { NewWebsiteForm } from '@/components/website/NewWebsiteForm'
import { getWebsiteTemplates } from '@/lib/actions/websites'

interface NewWebsitePageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: NewWebsitePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Website - ${studioSlug}`,
    description: 'Create a new portfolio website',
  }
}

export default async function NewWebsitePage({ params }: NewWebsitePageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const templates = await getWebsiteTemplates()

  return <NewWebsiteForm studioSlug={studioSlug} templates={templates} />
}

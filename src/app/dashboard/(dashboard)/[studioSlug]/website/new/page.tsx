import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getStudioForSettings } from '@/lib/actions/studios'
import { hasEntitlement } from '@/lib/entitlements'
import { NewWebsiteForm } from '@/components/website/NewWebsiteForm'
import { getWebsiteTemplates } from '@/lib/actions/websites'
import { FeatureUpgradePrompt } from '@/components/billing/FeatureUpgradePrompt'
import { Globe } from 'lucide-react'

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

  const studio = await getStudioForSettings(studioSlug)
  const entitled = studio ? await hasEntitlement(studio.id, 'website_builder') : false

  if (!entitled) {
    return (
      <FeatureUpgradePrompt
        studioSlug={studioSlug}
        icon={Globe}
        featureName="Website Builder"
        description="Turn your galleries and pricing into a portfolio site — no separate tool required. Included on Studio and up."
        minPlanName="Studio"
        minPlanPrice={29}
      />
    )
  }

  const templates = await getWebsiteTemplates()

  return <NewWebsiteForm studioSlug={studioSlug} templates={templates} />
}

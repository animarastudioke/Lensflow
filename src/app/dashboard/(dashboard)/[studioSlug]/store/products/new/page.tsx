import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStudioForSettings } from '@/lib/actions/studios'
import { hasEntitlement } from '@/lib/entitlements'
import { NewProductForm } from '@/components/store/NewProductForm'
import { FeatureUpgradePrompt } from '@/components/billing/FeatureUpgradePrompt'
import { Store } from 'lucide-react'

interface NewProductPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: NewProductPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Product - ${studioSlug}`,
    description: 'Add a new store product',
  }
}

export default async function NewProductPage({ params }: NewProductPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const studio = await getStudioForSettings(studioSlug)
  const entitled = studio ? await hasEntitlement(studio.id, 'store') : false

  if (!entitled) {
    return (
      <FeatureUpgradePrompt
        studioSlug={studioSlug}
        icon={Store}
        featureName="Online Store"
        description="Sell prints, albums, and digital downloads directly to your clients. Included on Studio and up."
        minPlanName="Studio"
        minPlanPrice={29}
      />
    )
  }

  return <NewProductForm studioSlug={studioSlug} />
}

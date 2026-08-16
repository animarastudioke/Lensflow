import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getStudioForSettings } from '@/lib/actions/studios'
import { hasEntitlement } from '@/lib/entitlements'
import { NewClientForm } from '@/components/clients/NewClientForm'
import { FeatureUpgradePrompt } from '@/components/billing/FeatureUpgradePrompt'
import { Users } from 'lucide-react'

interface NewClientPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({
  params,
}: NewClientPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Client - ${studioSlug}`,
    description: 'Add a new client or lead',
  }
}

export default async function NewClientPage({ params, searchParams }: NewClientPageProps) {
  const { studioSlug } = await params
  const { status } = await searchParams
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const isLead = status === 'lead'

  const studio = await getStudioForSettings(studioSlug)
  const entitled = studio ? await hasEntitlement(studio.id, 'crm') : false

  if (!entitled) {
    return (
      <FeatureUpgradePrompt
        studioSlug={studioSlug}
        icon={Users}
        featureName="Clients & CRM"
        description="Track leads, manage client details, and build your book of business. Included on Starter and up."
        minPlanName="Starter"
        minPlanPrice={12}
      />
    )
  }

  return (
    <NewClientForm
      studioSlug={studioSlug}
      defaultStatus={isLead ? 'lead' : 'active'}
      backHref={`/dashboard/${studioSlug}/${isLead ? 'leads' : 'clients'}`}
      backLabel={`Back to ${isLead ? 'leads' : 'clients'}`}
    />
  )
}

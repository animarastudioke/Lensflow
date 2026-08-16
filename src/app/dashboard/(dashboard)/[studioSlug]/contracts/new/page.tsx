import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getClients } from '@/lib/actions/clients'
import { getStudioForSettings } from '@/lib/actions/studios'
import { hasEntitlement } from '@/lib/entitlements'
import { NewContractForm } from '@/components/contracts/NewContractForm'
import { FeatureUpgradePrompt } from '@/components/billing/FeatureUpgradePrompt'
import { FileText } from 'lucide-react'

interface NewContractPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: NewContractPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Contract - ${studioSlug}`,
    description: 'Create a new contract',
  }
}

export default async function NewContractPage({ params }: NewContractPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const studio = await getStudioForSettings(studioSlug)
  const entitled = studio ? await hasEntitlement(studio.id, 'crm') : false

  if (!entitled) {
    return (
      <FeatureUpgradePrompt
        studioSlug={studioSlug}
        icon={FileText}
        featureName="Contracts"
        description="Send contracts for e-signature and keep them tied to each client and project. Included on Starter and up."
        minPlanName="Starter"
        minPlanPrice={12}
      />
    )
  }

  const { clients } = await getClients(studioSlug)

  return (
    <NewContractForm
      studioSlug={studioSlug}
      clients={clients.map(c => ({ id: c.id, name: c.name, email: c.email }))}
    />
  )
}

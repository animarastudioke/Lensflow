import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClients } from '@/lib/actions/clients'
import { getStudioForSettings } from '@/lib/actions/studios'
import { hasEntitlement } from '@/lib/entitlements'
import { NewQuoteForm } from '@/components/quotes/NewQuoteForm'
import { FeatureUpgradePrompt } from '@/components/billing/FeatureUpgradePrompt'
import { NotepadText } from 'lucide-react'

interface NewQuotePageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: NewQuotePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Quote - ${studioSlug}`,
    description: 'Create a new quote',
  }
}

export default async function NewQuotePage({ params }: NewQuotePageProps) {
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
        icon={NotepadText}
        featureName="Quotes"
        description="Send itemized quotes clients can review before booking. Included on Starter and up."
        minPlanName="Starter"
        minPlanPrice={12}
      />
    )
  }

  const { clients } = await getClients(studioSlug)

  return <NewQuoteForm studioSlug={studioSlug} clients={clients.map(c => ({ id: c.id, name: c.name }))} />
}

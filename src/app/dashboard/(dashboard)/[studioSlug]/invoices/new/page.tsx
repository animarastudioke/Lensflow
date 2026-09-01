import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClients } from '@/lib/actions/clients'
import { getStudioForSettings, getStudioCurrency } from '@/lib/actions/studios'
import { hasEntitlement } from '@/lib/entitlements'
import { NewInvoiceForm } from '@/components/invoices/NewInvoiceForm'
import { FeatureUpgradePrompt } from '@/components/billing/FeatureUpgradePrompt'
import { DollarSign } from 'lucide-react'

interface NewInvoicePageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ client?: string }>
}

export async function generateMetadata({
  params,
}: NewInvoicePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Invoice - ${studioSlug}`,
    description: 'Create a new invoice',
  }
}

export default async function NewInvoicePage({ params, searchParams }: NewInvoicePageProps) {
  const { studioSlug } = await params
  const { client: clientIdParam } = await searchParams
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const studio = await getStudioForSettings(studioSlug)
  const entitled = studio ? await hasEntitlement(studio.id, 'payments') : false

  if (!entitled) {
    return (
      <FeatureUpgradePrompt
        studioSlug={studioSlug}
        icon={DollarSign}
        featureName="Invoicing & payments"
        description="Send invoices and collect payments from clients via M-Pesa. Included on Starter and up."
        minPlanName="Starter"
        minPlanPrice={12}
      />
    )
  }

  const [{ clients }, currency] = await Promise.all([
    getClients(studioSlug),
    getStudioCurrency(studioSlug),
  ])
  const initialClientId = clients.some(c => c.id === clientIdParam) ? clientIdParam : undefined

  return (
    <NewInvoiceForm
      studioSlug={studioSlug}
      clients={clients.map(c => ({ id: c.id, name: c.name }))}
      initialClientId={initialClientId}
      currency={currency}
    />
  )
}

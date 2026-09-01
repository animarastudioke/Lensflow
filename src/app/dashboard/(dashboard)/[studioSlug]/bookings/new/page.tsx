import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClients } from '@/lib/actions/clients'
import { getStudioForSettings } from '@/lib/actions/studios'
import { hasEntitlement } from '@/lib/entitlements'
import { NewBookingForm } from '@/components/bookings/NewBookingForm'
import { FeatureUpgradePrompt } from '@/components/billing/FeatureUpgradePrompt'
import { CalendarDays } from 'lucide-react'

interface NewBookingPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ client?: string }>
}

export async function generateMetadata({
  params,
}: NewBookingPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Session - ${studioSlug}`,
    description: 'Schedule a new session',
  }
}

export default async function NewBookingPage({ params, searchParams }: NewBookingPageProps) {
  const { studioSlug } = await params
  const { client: clientIdParam } = await searchParams
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const studio = await getStudioForSettings(studioSlug)
  const entitled = studio ? await hasEntitlement(studio.id, 'booking') : false

  if (!entitled) {
    return (
      <FeatureUpgradePrompt
        studioSlug={studioSlug}
        icon={CalendarDays}
        featureName="Booking & availability"
        description="Let clients see your availability and book sessions online. Included on Starter and up."
        minPlanName="Starter"
        minPlanPrice={12}
      />
    )
  }

  const { clients } = await getClients(studioSlug)
  const initialClientId = clients.some(c => c.id === clientIdParam) ? clientIdParam : undefined

  return <NewBookingForm studioSlug={studioSlug} clients={clients.map(c => ({ id: c.id, name: c.name }))} initialClientId={initialClientId} />
}

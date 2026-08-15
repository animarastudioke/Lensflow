import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getStudioForSettings, getStudioSettings } from '@/lib/actions/studios'
import { getStudioBillingOverview, getSubscriptionPaymentHistory } from '@/lib/actions/billing'
import { SettingsPage } from '@/components/settings/SettingsPage'

interface SettingsPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({
  params,
}: SettingsPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Settings - ${studioSlug}`,
    description: 'Manage your studio settings',
  }
}

export default async function SettingsPageRoute({ params }: SettingsPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const studio = await getStudioForSettings(studioSlug)

  if (!studio) {
    notFound()
  }

  const [settings, billing, paymentHistory] = await Promise.all([
    getStudioSettings(studioSlug),
    getStudioBillingOverview(studioSlug),
    getSubscriptionPaymentHistory(studioSlug),
  ])

  return (
    <SettingsPage
      studioSlug={studioSlug}
      studioName={studio.name}
      isOwner={studio.ownerId === user.id}
      settings={settings}
      billing={billing}
      paymentHistory={paymentHistory}
    />
  )
}

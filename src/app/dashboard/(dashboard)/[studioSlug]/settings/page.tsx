import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
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

export default async function SettingsPageRoute({ params, searchParams }: SettingsPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  return (
    <DashboardLayout studioSlug={studioSlug} studioName="My Studio">
      <SettingsPage studioSlug={studioSlug} />
    </DashboardLayout>
  )
}
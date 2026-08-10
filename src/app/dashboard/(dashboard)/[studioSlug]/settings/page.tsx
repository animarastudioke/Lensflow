import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
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

  return <SettingsPage studioSlug={studioSlug} />
}
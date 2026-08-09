import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TeamList } from '@/components/team/TeamList'

interface TeamPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({
  params,
}: TeamPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Team - ${studioSlug}`,
    description: 'Manage your studio team members',
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  return (
    <DashboardLayout studioSlug={studioSlug} studioName="My Studio">
      <TeamList studioSlug={studioSlug} />
    </DashboardLayout>
  )
}
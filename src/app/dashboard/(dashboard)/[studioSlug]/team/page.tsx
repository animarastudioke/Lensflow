import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { getTeamMembers } from '@/lib/actions/team'
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

  const members = await getTeamMembers(studioSlug)
  const self = members.find((m) => m.userId === user.id)
  const canManage = self ? ['studio_owner', 'photographer'].includes(self.role) && self.status === 'active' : false

  return <TeamList studioSlug={studioSlug} initialMembers={members} canManage={canManage} />
}

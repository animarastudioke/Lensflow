import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProjectList } from '@/components/projects/ProjectList'

interface ProjectsPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}

export async function generateMetadata({
  params,
}: ProjectsPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Projects - ${studioSlug}`,
    description: 'Manage your projects and shoots',
  }
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  return (
    <DashboardLayout studioSlug={studioSlug} studioName="My Studio">
      <ProjectList studioSlug={studioSlug} />
    </DashboardLayout>
  )
}
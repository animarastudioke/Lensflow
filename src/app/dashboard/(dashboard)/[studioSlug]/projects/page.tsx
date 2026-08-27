import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { ProjectList } from '@/components/projects/ProjectList'
import { getProjects, getProjectFinancials } from '@/lib/actions/projects'
import { getStudioCurrency } from '@/lib/actions/studios'

const PROJECT_TYPES = ['wedding', 'portrait', 'engagement', 'family', 'corporate', 'event', 'commercial', 'other'] as const

function toProjectType(type: string): (typeof PROJECT_TYPES)[number] {
  return (PROJECT_TYPES as readonly string[]).includes(type) ? (type as (typeof PROJECT_TYPES)[number]) : 'other'
}

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

  const [{ projects }, financials, currency] = await Promise.all([
    getProjects(studioSlug),
    getProjectFinancials(studioSlug),
    getStudioCurrency(studioSlug),
  ])

  const initialProjects = projects.map(p => {
    const money = financials[p.id]
    return {
      id: p.id,
      clientId: p.client_id ?? '',
      clientName: p.client?.name || 'Unknown Client',
      clientEmail: p.client?.email || '',
      title: p.name,
      type: toProjectType(p.type),
      status: p.status,
      startDate: p.start_date ?? p.created_at,
      endDate: p.end_date ?? undefined,
      location: p.location ?? '',
      totalValue: money?.totalValue ?? 0,
      paidAmount: money?.paidAmount ?? 0,
      balanceDue: money?.balanceDue ?? 0,
      notes: p.description ?? undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }
  })

  return <ProjectList studioSlug={studioSlug} initialProjects={initialProjects} currency={currency} />
}
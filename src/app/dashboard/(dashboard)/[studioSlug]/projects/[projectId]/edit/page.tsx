import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getProject } from '@/lib/actions/projects'
import { getClients } from '@/lib/actions/clients'
import { getBookings } from '@/lib/actions/bookings'
import { EditProjectForm } from '@/components/projects/EditProjectForm'

interface EditProjectPageProps {
  params: Promise<{ studioSlug: string; projectId: string }>
}

export async function generateMetadata({
  params,
}: EditProjectPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Edit Project - ${studioSlug}`,
    description: 'Edit project details',
  }
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { studioSlug, projectId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [project, { clients }, { bookings }] = await Promise.all([
    getProject(projectId, studioSlug),
    getClients(studioSlug),
    getBookings(studioSlug),
  ])

  if (!project) {
    notFound()
  }

  return (
    <EditProjectForm
      studioSlug={studioSlug}
      clients={clients.map(c => ({ id: c.id, name: c.name }))}
      bookings={bookings.map(b => ({
        id: b.id,
        label: b.session_date ? `${b.session_name} — ${b.session_date}` : b.session_name,
      }))}
      initialValues={{
        id: project.id,
        name: project.name,
        type: project.type,
        status: project.status,
        clientId: project.client_id ?? '',
        bookingId: project.booking_id ?? '',
        location: project.location ?? '',
        startDate: project.start_date ?? '',
        endDate: project.end_date ?? '',
        description: project.description ?? '',
      }}
    />
  )
}

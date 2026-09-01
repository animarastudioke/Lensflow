import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getClients } from '@/lib/actions/clients'
import { getBookings } from '@/lib/actions/bookings'
import { NewProjectForm } from '@/components/projects/NewProjectForm'

interface NewProjectPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ client?: string }>
}

export async function generateMetadata({
  params,
}: NewProjectPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Project - ${studioSlug}`,
    description: 'Create a new project',
  }
}

export default async function NewProjectPage({ params, searchParams }: NewProjectPageProps) {
  const { studioSlug } = await params
  const { client: clientIdParam } = await searchParams
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [{ clients }, { bookings }] = await Promise.all([
    getClients(studioSlug),
    getBookings(studioSlug),
  ])
  const initialClientId = clients.some(c => c.id === clientIdParam) ? clientIdParam : undefined

  return (
    <NewProjectForm
      studioSlug={studioSlug}
      clients={clients.map(c => ({ id: c.id, name: c.name }))}
      bookings={bookings.map(b => ({
        id: b.id,
        label: b.session_date ? `${b.session_name} — ${b.session_date}` : b.session_name,
      }))}
      initialClientId={initialClientId}
    />
  )
}

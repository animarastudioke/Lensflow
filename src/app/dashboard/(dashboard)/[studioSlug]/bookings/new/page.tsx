import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClients } from '@/lib/actions/clients'
import { NewBookingForm } from '@/components/bookings/NewBookingForm'

interface NewBookingPageProps {
  params: Promise<{ studioSlug: string }>
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

export default async function NewBookingPage({ params }: NewBookingPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const { clients } = await getClients(studioSlug)

  return <NewBookingForm studioSlug={studioSlug} clients={clients.map(c => ({ id: c.id, name: c.name }))} />
}

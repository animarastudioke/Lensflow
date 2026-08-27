import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClients } from '@/lib/actions/clients'
import { NewGalleryForm } from '@/components/galleries/NewGalleryForm'

interface NewGalleryPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ client?: string }>
}

export async function generateMetadata({
  params,
}: NewGalleryPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Gallery - ${studioSlug}`,
    description: 'Create a new client gallery',
  }
}

export default async function NewGalleryPage({ params, searchParams }: NewGalleryPageProps) {
  const { studioSlug } = await params
  const { client: clientIdParam } = await searchParams
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const { clients } = await getClients(studioSlug)
  const initialClientId = clients.some(c => c.id === clientIdParam) ? clientIdParam : undefined

  return <NewGalleryForm studioSlug={studioSlug} clients={clients.map(c => ({ id: c.id, name: c.name }))} initialClientId={initialClientId} />
}

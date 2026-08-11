import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getClient } from '@/lib/actions/clients'
import { EditClientForm } from '@/components/clients/EditClientForm'

interface EditClientPageProps {
  params: Promise<{ studioSlug: string; clientId: string }>
}

export async function generateMetadata({
  params,
}: EditClientPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Edit Client - ${studioSlug}`,
    description: 'Edit client details',
  }
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { studioSlug, clientId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const client = await getClient(clientId, studioSlug)

  if (!client) {
    notFound()
  }

  return (
    <EditClientForm
      studioSlug={studioSlug}
      initialValues={{
        id: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        email: client.email,
        phone: client.phone ?? '',
        status: client.status,
        source: client.source ?? '',
        address: client.address ?? '',
        city: client.city ?? '',
        state: client.state ?? '',
        zipCode: client.zip_code ?? '',
        country: client.country ?? '',
      }}
    />
  )
}

import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { NewClientForm } from '@/components/clients/NewClientForm'

interface NewClientPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({
  params,
}: NewClientPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Client - ${studioSlug}`,
    description: 'Add a new client or lead',
  }
}

export default async function NewClientPage({ params, searchParams }: NewClientPageProps) {
  const { studioSlug } = await params
  const { status } = await searchParams
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const isLead = status === 'lead'

  return (
    <NewClientForm
      studioSlug={studioSlug}
      defaultStatus={isLead ? 'lead' : 'active'}
      backHref={`/dashboard/${studioSlug}/${isLead ? 'leads' : 'clients'}`}
      backLabel={`Back to ${isLead ? 'leads' : 'clients'}`}
    />
  )
}

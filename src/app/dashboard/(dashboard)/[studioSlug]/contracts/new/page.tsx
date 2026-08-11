import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getClients } from '@/lib/actions/clients'
import { NewContractForm } from '@/components/contracts/NewContractForm'

interface NewContractPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: NewContractPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Contract - ${studioSlug}`,
    description: 'Create a new contract',
  }
}

export default async function NewContractPage({ params }: NewContractPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const { clients } = await getClients(studioSlug)

  return (
    <NewContractForm
      studioSlug={studioSlug}
      clients={clients.map(c => ({ id: c.id, name: c.name, email: c.email }))}
    />
  )
}

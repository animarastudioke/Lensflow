import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getContract } from '@/lib/actions/contracts'
import { getClients } from '@/lib/actions/clients'
import { EditContractForm } from '@/components/contracts/EditContractForm'

interface EditContractPageProps {
  params: Promise<{ studioSlug: string; contractId: string }>
}

export async function generateMetadata({
  params,
}: EditContractPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Edit Contract - ${studioSlug}`,
    description: 'Edit contract details',
  }
}

export default async function EditContractPage({ params }: EditContractPageProps) {
  const { studioSlug, contractId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [contract, { clients }] = await Promise.all([
    getContract(contractId, studioSlug),
    getClients(studioSlug),
  ])

  if (!contract) {
    notFound()
  }

  return (
    <EditContractForm
      studioSlug={studioSlug}
      clients={clients.map(c => ({ id: c.id, name: c.name }))}
      initialValues={{
        id: contract.id,
        title: contract.title,
        type: contract.type,
        clientId: contract.client_id ?? 'none',
        totalValue: contract.total_value,
        depositRequired: contract.deposit_required,
        notes: contract.notes ?? '',
        expiresAt: contract.expires_at ? contract.expires_at.slice(0, 10) : '',
      }}
    />
  )
}

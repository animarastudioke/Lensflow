import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { getContracts } from '@/lib/actions/contracts'
import { getStudioCurrency } from '@/lib/actions/studios'
import { ContractList } from '@/components/contracts/ContractList'

interface ContractsPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}

export async function generateMetadata({
  params,
}: ContractsPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Contracts - ${studioSlug}`,
    description: 'Manage your contracts and agreements',
  }
}

export default async function ContractsPage({ params }: ContractsPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const [{ contracts }, currency] = await Promise.all([
    getContracts(studioSlug),
    getStudioCurrency(studioSlug),
  ])

  return <ContractList studioSlug={studioSlug} initialContracts={contracts} currency={currency} />
}
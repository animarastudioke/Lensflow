import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
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

  return (
    <DashboardLayout studioSlug={studioSlug} studioName="My Studio">
      <ContractList studioSlug={studioSlug} />
    </DashboardLayout>
  )
}
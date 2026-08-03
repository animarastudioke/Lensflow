import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ClientList } from '@/components/clients/ClientList'

interface ClientsPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}

export async function generateMetadata({
  params,
}: ClientsPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Clients - ${studioSlug}`,
    description: 'Manage your clients',
  }
}

export default async function ClientsPage({ params, searchParams }: ClientsPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null // Layout handles redirect
  }

  // In production, fetch clients from database
  // For now, pass empty array to use mock data in component
  const initialClients: any[] = []

  return (
    <DashboardLayout studioSlug={studioSlug} studioName="My Studio">
      <ClientList studioSlug={studioSlug} initialClients={initialClients} />
    </DashboardLayout>
  )
}
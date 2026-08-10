import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ClientList } from '@/components/clients/ClientList'
import { getClients } from '@/lib/actions/clients'

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

export default async function ClientsPage({ params }: ClientsPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null // Layout handles redirect
  }

  const { clients } = await getClients(studioSlug)
  const initialClients = clients.map(c => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    email: c.email,
    phone: c.phone ?? undefined,
    address: c.address ?? undefined,
    city: c.city ?? undefined,
    state: c.state ?? undefined,
    zipCode: c.zip_code ?? undefined,
    country: c.country ?? undefined,
    status: c.status,
    source: c.source ?? undefined,
    tags: c.tags,
    totalSpent: c.total_spent,
    totalOrders: c.total_orders,
    lastContact: c.last_contact ?? c.created_at,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }))

  return (
    <DashboardLayout studioSlug={studioSlug} studioName="My Studio">
      <ClientList studioSlug={studioSlug} initialClients={initialClients} />
    </DashboardLayout>
  )
}
import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { ClientList } from '@/components/clients/ClientList'
import { getClients } from '@/lib/actions/clients'
import { getStudioCurrency } from '@/lib/actions/studios'

interface LeadsPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: LeadsPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Leads - ${studioSlug}`,
    description: 'Prospective clients who have not booked yet',
  }
}

export default async function LeadsPage({ params }: LeadsPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const [{ clients }, currency] = await Promise.all([
    getClients(studioSlug, { status: 'lead' }),
    getStudioCurrency(studioSlug),
  ])

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
    <ClientList
      studioSlug={studioSlug}
      initialClients={initialClients}
      currency={currency}
      title="Leads"
      description="Prospective clients who haven't booked yet"
      newHref={`/dashboard/${studioSlug}/clients/new?status=lead`}
      newLabel="Add Lead"
    />
  )
}

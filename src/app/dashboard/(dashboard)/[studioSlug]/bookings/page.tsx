import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { BookingList } from '@/components/bookings/BookingList'
import { getBookings } from '@/lib/actions/bookings'
import { getStudioCurrency } from '@/lib/actions/studios'

const BOOKING_TYPES = ['wedding', 'portrait', 'engagement', 'family', 'corporate', 'event', 'other'] as const

function toBookingType(type: string): (typeof BOOKING_TYPES)[number] {
  return (BOOKING_TYPES as readonly string[]).includes(type) ? (type as (typeof BOOKING_TYPES)[number]) : 'other'
}

interface BookingsPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ page?: string; status?: string; date?: string }>
}

export async function generateMetadata({
  params,
}: BookingsPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Bookings - ${studioSlug}`,
    description: 'Manage your bookings and sessions',
  }
}

export default async function BookingsPage({ params }: BookingsPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const [{ bookings }, currency] = await Promise.all([
    getBookings(studioSlug),
    getStudioCurrency(studioSlug),
  ])
  const initialBookings = bookings.map(b => ({
    id: b.id,
    clientId: b.client_id ?? '',
    clientName: b.client?.name || b.session_name,
    clientEmail: b.client?.email || '',
    title: b.session_name,
    type: toBookingType(b.type),
    status: b.status === 'no_show' ? ('no-show' as const) : b.status,
    startDateTime: b.session_date ? `${b.session_date}T${b.start_time || '00:00:00'}` : b.created_at,
    endDateTime: b.session_date ? `${b.session_date}T${b.end_time || b.start_time || '00:00:00'}` : b.created_at,
    location: b.location ?? '',
    packageName: b.package_name ?? undefined,
    totalPrice: b.total_price,
    depositPaid: b.deposit_paid ? b.deposit_amount : 0,
    balanceDue: b.balance_due,
    notes: b.notes ?? undefined,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  }))

  return <BookingList studioSlug={studioSlug} initialBookings={initialBookings} currency={currency} />
}
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getBooking } from '@/lib/actions/bookings'
import { getClients } from '@/lib/actions/clients'
import { EditBookingForm } from '@/components/bookings/EditBookingForm'

interface EditBookingPageProps {
  params: Promise<{ studioSlug: string; bookingId: string }>
}

export async function generateMetadata({
  params,
}: EditBookingPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Edit Booking - ${studioSlug}`,
    description: 'Edit booking details',
  }
}

export default async function EditBookingPage({ params }: EditBookingPageProps) {
  const { studioSlug, bookingId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [booking, { clients }] = await Promise.all([
    getBooking(bookingId, studioSlug),
    getClients(studioSlug),
  ])

  if (!booking) {
    notFound()
  }

  return (
    <EditBookingForm
      studioSlug={studioSlug}
      clients={clients.map(c => ({ id: c.id, name: c.name }))}
      initialValues={{
        id: booking.id,
        sessionName: booking.session_name,
        type: booking.type,
        status: booking.status,
        clientId: booking.client_id ?? '',
        packageName: booking.package_name ?? '',
        sessionDate: booking.session_date ?? '',
        startTime: booking.start_time?.slice(0, 5) ?? '',
        endTime: booking.end_time?.slice(0, 5) ?? '',
        location: booking.location ?? '',
        totalPrice: booking.total_price,
        depositAmount: booking.deposit_amount,
        notes: booking.notes ?? '',
      }}
    />
  )
}

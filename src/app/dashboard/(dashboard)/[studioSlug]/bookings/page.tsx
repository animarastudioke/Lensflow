import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { BookingList } from '@/components/bookings/BookingList'

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

  return (
    <DashboardLayout studioSlug={studioSlug} studioName="My Studio">
      <BookingList studioSlug={studioSlug} />
    </DashboardLayout>
  )
}
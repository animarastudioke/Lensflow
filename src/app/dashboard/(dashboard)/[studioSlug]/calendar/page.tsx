import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { CalendarView } from '@/components/calendar/CalendarView'

interface CalendarPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: CalendarPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Calendar - ${studioSlug}`,
    description: 'Bookings, invoice due dates, contract expirations, and tasks in one view',
  }
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  return <CalendarView studioSlug={studioSlug} />
}

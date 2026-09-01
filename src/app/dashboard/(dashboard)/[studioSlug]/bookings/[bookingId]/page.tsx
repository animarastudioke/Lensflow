import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { getAuthUserServer } from '@/lib/auth'
import { getBooking } from '@/lib/actions/bookings'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/layout/StatusBadge'
import { BookingDetailActions } from '@/components/bookings/BookingDetailActions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, MapPin, Mail } from 'lucide-react'

interface BookingDetailPageProps {
  params: Promise<{ studioSlug: string; bookingId: string }>
}

export async function generateMetadata({
  params,
}: BookingDetailPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Booking - ${studioSlug}`,
    description: 'View booking details',
  }
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { studioSlug, bookingId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [booking, currency] = await Promise.all([
    getBooking(bookingId, studioSlug),
    getStudioCurrency(studioSlug),
  ])

  if (!booking) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={booking.session_name}
        description={booking.package_name ?? undefined}
        backHref={`/dashboard/${studioSlug}/bookings`}
        actions={<BookingDetailActions bookingId={booking.id} studioSlug={studioSlug} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Session details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} />
          </div>
          {booking.session_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(`${booking.session_date}T00:00:00`), 'EEEE, MMMM d, yyyy')}</span>
            </div>
          )}
          {(booking.start_time || booking.end_time) && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {booking.start_time?.slice(0, 5) ?? '—'}
                {booking.end_time ? ` - ${booking.end_time.slice(0, 5)}` : ''}
              </span>
            </div>
          )}
          {booking.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{booking.location}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {booking.client ? (
            <>
              {booking.client_id ? (
                <Link
                  href={`/dashboard/${studioSlug}/clients/${booking.client_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {booking.client.name}
                </Link>
              ) : (
                <p className="font-medium">{booking.client.name}</p>
              )}
              {booking.client.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${booking.client.email}`} className="hover:underline">{booking.client.email}</a>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No client attached to this booking.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Total price</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(booking.total_price, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Deposit</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">
                {formatCurrency(booking.deposit_amount, currency)}{' '}
                <span className="text-xs text-muted-foreground font-sans">{booking.deposit_paid ? '(paid)' : '(unpaid)'}</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Balance due</dt>
              <dd className={`font-mono tabular-nums font-medium mt-1 ${booking.balance_due > 0 ? 'text-destructive' : 'text-success'}`}>
                {formatCurrency(booking.balance_due, currency)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {booking.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

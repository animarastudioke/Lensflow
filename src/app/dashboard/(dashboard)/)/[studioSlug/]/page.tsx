import { Metadata } from 'next'
import { DashboardLayout } from '@/components/layout'
import { getDashboardData } from '@/components/layout'
import { redirect } from 'next/navigation'
import { getAuthUser, requireAuth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your LensFlow dashboard overview',
}

interface Props {
  params: Promise<{ studioSlug: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { studioSlug } = await params
  const user = await getAuthUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Verify user has access to this studio
  // In a real app, this would check team_members table
  const studioName = 'My Studio' // Would come from database

  return (
    <DashboardLayout studioSlug={studioSlug} studioName={studioName}>
      <DashboardContent studioSlug={studioSlug} user={user} />
    </DashboardLayout>
  )
}

function DashboardContent({ studioSlug, user }: { studioSlug: string; user: any }) {
  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display font-bold tracking-tight">
            Welcome back, {user.firstName}
          </h1>
          <p className="text-body text-muted-foreground mt-1">
            Here's what's happening with your studio today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/dashboard/${studioSlug}/galleries/new`}
            className="btn-primary"
          >
            <span>Create Gallery</span>
          </a>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Galleries"
          value="12"
          change="+2 this month"
          changeType="positive"
          icon="gallery"
        />
        <StatCard
          title="Total Photos"
          value="2,847"
          change="+342 this month"
          changeType="positive"
          icon="photo"
        />
        <StatCard
          title="Revenue"
          value="$12,450"
          change="+18% vs last month"
          changeType="positive"
          icon="revenue"
        />
        <StatCard
          title="Upcoming Bookings"
          value="5"
          change="3 this week"
          changeType="neutral"
          icon="booking"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <QuickActionCard
          title="Create Gallery"
          description="Deliver photos to your clients"
          icon="gallery"
          href={`/dashboard/${studioSlug}/galleries/new`}
        />
        <QuickActionCard
          title="New Booking"
          description="Schedule a session with a client"
          icon="calendar"
          href={`/dashboard/${studioSlug}/bookings/new`}
        />
        <QuickActionCard
          title="Send Invoice"
          description="Bill a client for your services"
          icon="invoice"
          href={`/dashboard/${studioSlug}/invoices/new`}
        />
        <QuickActionCard
          title="Add Client"
          description="Add a new client to your CRM"
          icon="client"
          href={`/dashboard/${studioSlug}/clients/new`}
        />
        <QuickActionCard
          title="Create Quote"
          description="Send a quotation to a lead"
          icon="quote"
          href={`/dashboard/${studioSlug}/quotes/new`}
        />
        <QuickActionCard
          title="Add Product"
          description="List a new product in your store"
          icon="store"
          href={`/dashboard/${studioSlug}/store/products/new`}
        />
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivityCard />
        <UpcomingBookingsCard />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
}: {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: string
}) {
  const icons = {
    gallery: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    photo: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    revenue: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    booking: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  }

  const changeColors = {
    positive: 'text-success',
    negative: 'text-destructive',
    neutral: 'text-muted-foreground',
  }

  return (
    <div className="card-hover rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-body-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-display-sm font-display font-bold">{value}</p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {icons[icon as keyof typeof icons]}
        </div>
      </div>
      <p className={cn('mt-4 text-body-sm font-medium', changeColors[changeType])}>
        {change}
      </p>
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  icon,
  href,
}: {
  title: string
  description: string
  icon: string
  href: string
}) {
  const icons = {
    gallery: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    calendar: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    invoice: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    client: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    quote: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    store: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  }

  return (
    <a
      href={href}
      className="card-hover group rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-200"
    >
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icons[icon as keyof typeof icons]}
      </div>
      <h3 className="text-heading-md font-semibold">{title}</h3>
      <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
    </a>
  )
}

function RecentActivityCard() {
  const activities = [
    { id: 1, type: 'gallery_created', title: 'Created gallery "Smith Wedding"', time: '2 hours ago', user: 'You' },
    { id: 2, type: 'payment_received', title: 'Payment received for Invoice #INV-001', time: '4 hours ago', user: 'Marcus Johnson', amount: '$2,500' },
    { id: 3, type: 'booking_confirmed', title: 'Booking confirmed: Portrait Session', time: 'Yesterday', user: 'Sarah Chen' },
    { id: 4, type: 'client_added', title: 'New client added: Grace Ochieng', time: '2 days ago', user: 'You' },
    { id: 5, type: 'comment_received', title: 'New comment on "Family Portraits" gallery', time: '3 days ago', user: 'David Lee' },
  ]

  return (
    <div className="card-hover rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-heading-md font-semibold">Recent Activity</h3>
        <a href="/dashboard/activity" className="text-sm text-primary hover:underline">
          View all
        </a>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium">{activity.title}</p>
              <p className="text-xs text-muted-foreground">
                {activity.user} • {activity.time}
              </p>
            </div>
            {activity.amount && (
              <span className="text-body-sm font-medium text-success">{activity.amount}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function UpcomingBookingsCard() {
  const bookings = [
    { id: 1, client: 'Sarah Chen', type: 'Wedding Package', date: 'Jun 15, 2024', time: '10:00 AM', status: 'confirmed' },
    { id: 2, client: 'Marcus Johnson', type: 'Portrait Session', date: 'Jun 18, 2024', time: '2:00 PM', status: 'pending' },
    { id: 3, client: 'Grace Ochieng', type: 'Event Coverage', date: 'Jun 22, 2024', time: '6:00 PM', status: 'confirmed' },
    { id: 4, client: 'David Lee', type: 'Mini Session', date: 'Jun 25, 2024', time: '11:00 AM', status: 'confirmed' },
    { id: 5, client: 'Emily Brown', type: 'Family Portraits', date: 'Jul 2, 2024', time: '4:00 PM', status: 'pending' },
  ]

  return (
    <div className="card-hover rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-heading-md font-semibold">Upcoming Bookings</h3>
        <a href="/dashboard/bookings" className="text-sm text-primary hover:underline">
          View all
        </a>
      </div>
      <div className="space-y-3">
        {bookings.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">{booking.client}</p>
              <p className="text-sm text-muted-foreground">{booking.type}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{booking.date}</p>
              <p className="text-sm text-muted-foreground">{booking.time}</p>
            </div>
            <span className={cn('ml-4 px-2 py-1 rounded-full text-xs font-medium', booking.status === 'confirmed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
              {booking.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
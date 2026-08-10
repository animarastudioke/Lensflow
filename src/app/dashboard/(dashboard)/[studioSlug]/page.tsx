import { Metadata } from 'next'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getAuthUserServer } from '@/lib/auth'
import { getUpcomingBookings } from '@/lib/actions/bookings'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Image,
  Calendar,
  DollarSign,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Store,
} from 'lucide-react'
import { format } from 'date-fns'

interface DashboardPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: DashboardPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Dashboard - ${studioSlug}`,
    description: 'Your LensFlow studio dashboard',
  }
}

async function getDashboardData(studioSlug: string) {
  // In production, this would fetch from database
  // For now, return mock data structure
  interface ActivityItem {
    id: string
    message: string
    time: string
    icon: any
  }

  interface QuickAction {
    title: string
    description: string
    icon: any
    href: string
    primary?: boolean
  }

  interface StatItem {
    label: string
    value: string
    change: string
    icon: any
    href: string
  }

  return {
    stats: [
      { label: 'Total Galleries', value: '0', change: '+12%', icon: Image, href: `/dashboard/${studioSlug}/galleries` },
      { label: 'Active Clients', value: '0', change: '+5%', icon: Users, href: `/dashboard/${studioSlug}/clients` },
      { label: 'Upcoming Bookings', value: '0', change: '+3', icon: Calendar, href: `/dashboard/${studioSlug}/bookings` },
      { label: 'Monthly Revenue', value: '$0', change: '+18%', icon: DollarSign, href: `/dashboard/${studioSlug}/invoices` },
    ] as StatItem[],
    recentActivity: [] as ActivityItem[],
    quickActions: [
      { title: 'Create Gallery', description: 'Start a new client gallery', icon: Plus, href: `/dashboard/${studioSlug}/galleries/new`, primary: true },
      { title: 'Add Client', description: 'Add a new client to your CRM', icon: Users, href: `/dashboard/${studioSlug}/clients/new` },
      { title: 'Create Booking', description: 'Schedule a new session', icon: Calendar, href: `/dashboard/${studioSlug}/bookings/new` },
      { title: 'Send Quote', description: 'Create and send a quote', icon: FileText, href: `/dashboard/${studioSlug}/quotes/new` },
      { title: 'Create Invoice', description: 'Bill a client for services', icon: DollarSign, href: `/dashboard/${studioSlug}/invoices/new` },
      { title: 'Add Product', description: 'Add items to your store', icon: Store, href: `/dashboard/${studioSlug}/store/products/new` },
    ] as QuickAction[],
  }
}

async function getUpcoming(studioSlug: string) {
  const bookings = await getUpcomingBookings(studioSlug)
  return bookings.map(b => ({
    id: b.id,
    clientName: b.client?.name || b.session_name,
    startDateTime: b.session_date
      ? `${b.session_date}T${b.start_time || '00:00:00'}`
      : b.created_at,
    status: b.status,
  }))
}

async function getStudioInfo(studioSlug: string) {
  // In production, fetch from database
  return {
    name: 'My Studio',
    slug: studioSlug,
  }
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null // Layout handles redirect
  }

  const [dashboardData, studioInfo, upcomingBookings] = await Promise.all([
    getDashboardData(studioSlug),
    getStudioInfo(studioSlug),
    getUpcoming(studioSlug),
  ])

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-md font-display font-semibold text-foreground">
              Welcome back, {user.firstName}
            </h1>
            <p className="text-body text-muted-foreground mt-1">
              Here's what's happening with {studioInfo.name} today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/${studioSlug}/galleries/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Gallery
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats plaque: one bordered region, hairline dividers, not repeated cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border border border-border">
          {dashboardData.stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group px-5 py-5 transition-colors hover:bg-accent"
            >
              <div className="flex items-center justify-between">
                <span className="label-caption">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
              </div>
              <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
                {stat.value}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-success">
                {stat.change} vs last month
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions & Upcoming */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-heading font-semibold">Quick Actions</h2>
            <div className="border-y border-border divide-y divide-border">
              {dashboardData.quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-accent -mx-1 px-1"
                >
                  <action.icon
                    className={cn('h-5 w-5 flex-shrink-0', action.primary ? 'text-primary' : 'text-muted-foreground')}
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          {/* Right sidebar - Upcoming & Recent */}
          <div className="space-y-6">
            {/* Upcoming Bookings */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
                <Link href={`/dashboard/${studioSlug}/bookings`} className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">No upcoming bookings</p>
                    <Link href={`/dashboard/${studioSlug}/bookings/new`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Schedule Session
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {upcomingBookings.map((booking) => (
                      <li key={booking.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{booking.clientName}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(booking.startDateTime), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-success/10 text-success">
                          {booking.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Link href={`/dashboard/${studioSlug}/activity`} className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {dashboardData.recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {dashboardData.recentActivity.map((activity) => (
                      <li key={activity.id} className="flex items-start gap-3 text-sm">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <activity.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}
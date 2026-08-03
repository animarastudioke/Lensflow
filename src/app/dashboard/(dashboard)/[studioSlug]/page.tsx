import { Metadata } from 'next'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Image,
  Images,
  Calendar,
  DollarSign,
  BarChart3,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Briefcase,
  FileText,
  Store,
  Globe,
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
  interface UpcomingBooking {
    id: string
    clientName: string
    startDateTime: string
    status: string
  }

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
    upcomingBookings: [] as UpcomingBooking[],
  }
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

  const [dashboardData, studioInfo] = await Promise.all([
    getDashboardData(studioSlug),
    getStudioInfo(studioSlug),
  ])

  return (
    <DashboardLayout studioSlug={studioSlug} studioName={studioInfo.name}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-md font-display font-bold text-foreground">
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

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dashboardData.stats.map((stat, index) => (
            <Card key={stat.label} className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {stat.change} vs last month
                </p>
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-0">
                <Link href={stat.href} className="text-sm text-primary hover:underline flex items-center gap-1">
                  View details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Quick Actions & Upcoming */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-heading font-semibold">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dashboardData.quickActions.map((action, index) => (
                <Link key={action.title} href={action.href}>
                  <Card className={action.primary ? 'border-primary/50 bg-primary/5' : 'card-hover'}>
                    <CardContent className="pt-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-10 w-10 rounded-lg flex items-center justify-center',
                          action.primary ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}>
                          <action.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{action.title}</p>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                {dashboardData.upcomingBookings.length === 0 ? (
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
                    {dashboardData.upcomingBookings.map((booking) => (
                      <li key={booking.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{booking.clientName}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(booking.startDateTime), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
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

        {/* Feature Overview */}
        <div className="border-t border-border pt-6">
          <h2 className="text-heading font-semibold mb-4">Explore Features</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {[
              { title: 'Galleries', description: 'Client photo delivery', icon: Images, href: `/dashboard/${studioSlug}/galleries` },
              { title: 'Clients', description: 'CRM & relationships', icon: Users, href: `/dashboard/${studioSlug}/clients` },
              { title: 'Projects', description: 'Track shoots & deliverables', icon: Briefcase, href: `/dashboard/${studioSlug}/projects` },
              { title: 'Bookings', description: 'Schedule & manage sessions', icon: Calendar, href: `/dashboard/${studioSlug}/bookings` },
              { title: 'Contracts', description: 'Digital signatures & docs', icon: FileText, href: `/dashboard/${studioSlug}/contracts` },
              { title: 'Store', description: 'Sell prints & digital', icon: Store, href: `/dashboard/${studioSlug}/store` },
              { title: 'Website', description: 'Portfolio & landing pages', icon: Globe, href: `/dashboard/${studioSlug}/website` },
              { title: 'Analytics', description: 'Revenue & insights', icon: BarChart3, href: `/dashboard/${studioSlug}/analytics` },
            ].map((feature) => (
              <Link key={feature.title} href={feature.href}>
                <Card className="card-hover text-center p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
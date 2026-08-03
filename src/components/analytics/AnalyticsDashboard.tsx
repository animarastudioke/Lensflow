'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format, subDays, startOfMonth, startOfWeek, eachDayOfInterval, addMonths } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Camera,
  BarChart3,
  Calendar,
  ArrowRight,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { SpriteSpinner } from '@/components/ui/sprite-spinner'

// Simple chart using SVG
interface ChartDataPoint {
  date: string
  value: number
  label: string
}

function LineChart({ data, height = 200, color = 'hsl(var(--primary))', strokeWidth = 2 }: {
  data: ChartDataPoint[]
  height?: number
  color?: string
  strokeWidth?: number
}) {
  if (data.length === 0) return <div className="h-[200px] flex items-center justify-center text-muted-foreground">No data</div>

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1
  const padding = 20
  const chartWidth = 500 // Will be responsive via CSS
  const stepX = (chartWidth - padding * 2) / (data.length - 1)

  const points = data.map((d, i) => {
    const x = padding + i * stepX
    const y = height - padding - ((d.value - minValue) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area */}
        <path
          d={`M${points} L${chartWidth - padding},${height - padding} L${padding},${height - padding} Z`}
          fill="url(#chartGradient)"
        />
        {/* Line */}
        <path
          d={`M${points}`}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={padding + i * stepX}
            cy={height - padding - ((d.value - minValue) / range) * (height - padding * 2)}
            r={4}
            fill={color}
            className="hover:r-5 transition-r"
          />
        ))}
      </svg>
    </div>
  )
}

function BarChart({ data, height = 200, color = 'hsl(var(--primary))' }: {
  data: ChartDataPoint[]
  height?: number
  color?: string
}) {
  if (data.length === 0) return <div className="h-[200px] flex items-center justify-center text-muted-foreground">No data</div>

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1
  const padding = 20
  const chartWidth = 500
  const barWidth = (chartWidth - padding * 2) / data.length * 0.7
  const gap = (chartWidth - padding * 2) / data.length * 0.3

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const x = padding + i * (barWidth + gap)
          const barHeight = ((d.value - minValue) / range) * (height - padding * 2)
          const y = height - padding - barHeight
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={2}
                className="hover:opacity-80 transition-opacity"
              />
              <text
                x={x + barWidth / 2}
                y={height - padding + 15}
                textAnchor="middle"
                fontSize="10"
                fill="hsl(var(--muted-foreground))"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

interface AnalyticsDashboardProps {
  studioSlug: string
  isLoading?: boolean
}

export function AnalyticsDashboard({ studioSlug, isLoading = false }: AnalyticsDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [period, setPeriod] = React.useState<'7d' | '30d' | '90d' | '1y'>('30d')

  // Mock data for charts
  const generateMockData = (days: number) => {
    const data: ChartDataPoint[] = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i)
      data.push({
        date: format(date, 'yyyy-MM-dd'),
        label: format(date, 'MMM d'),
        value: Math.floor(Math.random() * 100) + 50,
      })
    }
    return data
  }

  const revenueData = generateMockData(period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365)
  const visitsData = generateMockData(period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365)
  const bookingsData = generateMockData(period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365)

  // Mock stats
  const stats = [
    { label: 'Total Revenue', value: '$47,892', change: '+12.5%', changeType: 'positive' as const, icon: DollarSign },
    { label: 'Bookings', value: '24', change: '+3', changeType: 'positive' as const, icon: Calendar },
    { label: 'Active Clients', value: '18', change: '+2', changeType: 'positive' as const, icon: Users },
    { label: 'Gallery Views', value: '12.4K', change: '+8.2%', changeType: 'positive' as const, icon: Camera },
    { label: 'Conversion Rate', value: '3.2%', change: '-0.3%', changeType: 'negative' as const, icon: TrendingUp },
    { label: 'Avg. Order Value', value: '$1,995', change: '+5.1%', changeType: 'positive' as const, icon: DollarSign },
  ]

  // Top performing galleries
  const topGalleries = [
    { name: 'Chen Wedding', views: 2340, revenue: 4500, conversion: 12.5 },
    { name: 'Johnson Family', views: 1890, revenue: 800, conversion: 8.2 },
    { name: 'Park Corporate', views: 1560, revenue: 1200, conversion: 15.3 },
    { name: 'Rodriguez Engagement', views: 980, revenue: 600, conversion: 5.1 },
  ]

  // Revenue by source
  const revenueBySource = [
    { source: 'Weddings', value: 28500, percentage: 59.5 },
    { source: 'Portraits', value: 8900, percentage: 18.6 },
    { source: 'Prints/Albums', value: 5200, percentage: 10.9 },
    { source: 'Corporate', value: 3400, percentage: 7.1 },
    { source: 'Digital', value: 1892, percentage: 3.9 },
  ]

  // Monthly comparison
  const monthlyComparison = [
    { month: 'Jan', revenue: 12400, bookings: 8 },
    { month: 'Feb', revenue: 15600, bookings: 10 },
    { month: 'Mar', revenue: 18200, bookings: 12 },
    { month: 'Apr', revenue: 14800, bookings: 9 },
    { month: 'May', revenue: 22100, bookings: 14 },
    { month: 'Jun', revenue: 25600, bookings: 16 },
    { month: 'Jul', revenue: 19800, bookings: 11 },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold h-8 w-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display font-bold text-foreground">Analytics</h1>
          <p className="text-body text-muted-foreground mt-1">Track your studio performance and growth</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, index) => (
          <Card key={index} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs mt-1 flex items-center gap-1 ${stat.changeType === 'positive' ? 'text-success' : 'text-destructive'}`}>
                {stat.changeType === 'positive' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stat.change} vs last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-lg">Revenue Overview</CardTitle>
          <CardDescription>Total revenue over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <LineChart data={revenueData} height={300} color="hsl(var(--primary))" />
          </div>
        </CardContent>
      </Card>

      {/* Visits & Bookings Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Website Visits</CardTitle>
            <CardDescription>Unique visitors to your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <LineChart data={visitsData} height={250} color="hsl(var(--secondary))" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bookings</CardTitle>
            <CardDescription>New bookings received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <BarChart data={bookingsData} height={250} color="hsl(var(--accent))" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Source & Monthly Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Source</CardTitle>
            <CardDescription>Breakdown of revenue sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueBySource.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.source}</span>
                    <span className="font-bold">${item.value.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.percentage} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-[40px] text-right">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Comparison</CardTitle>
            <CardDescription>Revenue vs bookings by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyComparison.map((month, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-[50px]">{month.month}</span>
                  <div className="flex-1 h-8 bg-muted rounded relative overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(month.revenue / 25600) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-[80px] text-right">${month.revenue.toLocaleString()}</span>
                  <div className="flex-1 h-8 bg-muted rounded relative overflow-hidden">
                    <div
                      className="h-full bg-secondary"
                      style={{ width: `${(month.bookings / 16) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-[40px] text-right">{month.bookings}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Galleries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Top Performing Galleries</CardTitle>
            <CardDescription>Galleries with highest engagement and revenue</CardDescription>
          </div>
          <Link href={`/dashboard/${studioSlug}/galleries`} className="text-sm text-primary hover:underline flex items-center gap-1">
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-4 font-medium text-sm text-muted-foreground">Gallery</th>
                  <th className="text-right p-4 font-medium text-sm text-muted-foreground">Views</th>
                  <th className="text-right p-4 font-medium text-sm text-muted-foreground">Revenue</th>
                  <th className="text-right p-4 font-medium text-sm text-muted-foreground">Conversion</th>
                  <th className="text-right p-4 font-medium text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topGalleries.map((gallery, index) => (
                  <tr key={index} className="border-t border-border hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-medium">{gallery.name}</div>
                    </td>
                    <td className="p-4 text-right text-sm text-muted-foreground">{gallery.views.toLocaleString()}</td>
                    <td className="p-4 text-right text-sm font-medium">${gallery.revenue.toLocaleString()}</td>
                    <td className="p-4 text-right text-sm">
                      <Badge variant="outline">{gallery.conversion}%</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/${studioSlug}/galleries/${gallery.name.toLowerCase().replace(' ', '-')}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Gallery
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/${studioSlug}/analytics/galleries/${gallery.name.toLowerCase().replace(' ', '-')}`}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Detailed Analytics
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Acquisition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Referrals', value: 45, color: 'hsl(var(--primary))' },
                { label: 'Instagram', value: 28, color: 'hsl(var(--secondary))' },
                { label: 'Google Search', value: 15, color: 'hsl(var(--accent))' },
                { label: 'Direct', value: 12, color: 'hsl(var(--muted-foreground))' },
              ].map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-bold">{item.value}%</span>
                  </div>
                  <Progress value={item.value} className="h-2" style={{ '--progress-color': item.color }} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Inquiries', value: 120, color: 'hsl(var(--primary))' },
                { label: 'Quotes Sent', value: 85, color: 'hsl(var(--secondary))' },
                { label: 'Contracts Signed', value: 42, color: 'hsl(var(--accent))' },
                { label: 'Booked', value: 24, color: 'hsl(var(--success))' },
              ].map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                  <Progress value={(item.value / 120) * 100} className="h-2" style={{ '--progress-color': item.color }} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/dashboard/${studioSlug}/bookings/new`} className="card-hover p-4 text-center block">
                <Calendar className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="font-medium">Schedule Session</p>
              </Link>
              <Link href={`/dashboard/${studioSlug}/galleries/new`} className="card-hover p-4 text-center block">
                <Camera className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="font-medium">Create Gallery</p>
              </Link>
              <Link href={`/dashboard/${studioSlug}/clients/new`} className="card-hover p-4 text-center block">
                <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="font-medium">Add Client</p>
              </Link>
              <Link href={`/dashboard/${studioSlug}/invoices/new`} className="card-hover p-4 text-center block">
                <DollarSign className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="font-medium">Send Invoice</p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
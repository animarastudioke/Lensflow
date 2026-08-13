'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Calendar,
  ArrowRight,
  Download,
  Loader2,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/currencies'
import { getAnalyticsOverview, type AnalyticsData, type AnalyticsRange, type AnalyticsSeriesPoint } from '@/lib/actions/analytics'

function LineChart({ data, height = 200, color = 'hsl(var(--primary))' }: {
  data: AnalyticsSeriesPoint[]
  height?: number
  color?: string
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">No data in this period yet</div>
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const minValue = Math.min(...data.map((d) => d.value), 0)
  const range = maxValue - minValue || 1
  const padding = 20
  const chartWidth = 500
  const stepX = data.length > 1 ? (chartWidth - padding * 2) / (data.length - 1) : 0

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
        <path d={`M${points} L${chartWidth - padding},${height - padding} L${padding},${height - padding} Z`} fill="url(#chartGradient)" />
        <path d={`M${points}`} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={padding + i * stepX} cy={height - padding - ((d.value - minValue) / range) * (height - padding * 2)} r={3} fill={color} />
        ))}
      </svg>
    </div>
  )
}

function BarChart({ data, height = 200, color = 'hsl(var(--primary))' }: {
  data: AnalyticsSeriesPoint[]
  height?: number
  color?: string
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">No data in this period yet</div>
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const padding = 20
  const chartWidth = 500
  const barWidth = ((chartWidth - padding * 2) / data.length) * 0.7
  const gap = ((chartWidth - padding * 2) / data.length) * 0.3

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const x = padding + i * (barWidth + gap)
          const barHeight = (d.value / maxValue) * (height - padding * 2)
          const y = height - padding - barHeight
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} fill={color} rx={2} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

interface AnalyticsDashboardProps {
  studioSlug: string
}

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
]

export function AnalyticsDashboard({ studioSlug }: AnalyticsDashboardProps) {
  const [range, setRange] = React.useState<AnalyticsRange>('30d')
  const [data, setData] = React.useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    getAnalyticsOverview(studioSlug, range).then((result) => {
      if (!cancelled) {
        setData(result)
        setIsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [studioSlug, range])

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading analytics…
        </div>
      </div>
    )
  }

  const { stats, currency } = data

  const statCards = [
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue, currency), change: stats.revenueChangePercent, icon: DollarSign },
    { label: 'Bookings', value: stats.bookings.toLocaleString(), change: stats.bookingsChangePercent, icon: Calendar },
    { label: 'Active Clients', value: stats.activeClients.toLocaleString(), change: null, icon: Users },
    { label: 'Gallery Views', value: stats.galleryViews.toLocaleString(), change: null, icon: Camera },
    { label: 'Outstanding', value: formatCurrency(stats.outstandingInvoices, currency), change: null, icon: DollarSign },
    { label: 'Avg. Order Value', value: formatCurrency(stats.avgOrderValue, currency), change: null, icon: DollarSign },
  ]

  const maxFunnelValue = Math.max(...data.funnel.map((f) => f.value), 1)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display font-semibold text-foreground">Analytics</h1>
          <p className="text-body text-muted-foreground mt-1">Track your studio performance and growth</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(value) => setRange(value as AnalyticsRange)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 divide-y lg:divide-y-0 divide-x-0 lg:divide-x divide-border border border-border">
        {statCards.map((stat, index) => (
          <div key={index} className="px-5 py-5">
            <div className="flex items-center justify-between">
              <span className="label-caption">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
            </div>
            <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">{stat.value}</div>
            {stat.change !== null && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${stat.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stat.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="font-mono tabular-nums">{stat.change > 0 ? '+' : ''}{stat.change}%</span> vs last period
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-lg">Revenue Overview</CardTitle>
          <CardDescription>Fully-paid invoices over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <LineChart data={data.revenueSeries} height={300} color="hsl(var(--primary))" />
        </CardContent>
      </Card>

      {/* Bookings & Funnel */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bookings</CardTitle>
            <CardDescription>New bookings received</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={data.bookingsSeries} height={220} color="hsl(var(--accent))" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Funnel</CardTitle>
            <CardDescription>Leads to confirmed bookings, this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.funnel.map((stage) => (
                <div key={stage.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{stage.label}</span>
                    <span className="font-mono tabular-nums font-medium">{stage.value}</span>
                  </div>
                  <Progress value={(stage.value / maxFunnelValue) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Sources & Top Galleries */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Sources</CardTitle>
            <CardDescription>Where your clients say they found you</CardDescription>
          </CardHeader>
          <CardContent>
            {data.clientSources.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No client source data yet — set a &quot;source&quot; when adding clients to see this breakdown.
              </p>
            ) : (
              <div className="space-y-4">
                {data.clientSources.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="font-mono tabular-nums font-medium">{item.value}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={item.percentage} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-[40px] text-right">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Top Galleries</CardTitle>
              <CardDescription>By all-time views</CardDescription>
            </div>
            <Link href={`/dashboard/${studioSlug}/galleries`} className="text-sm text-primary hover:underline flex items-center gap-1">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.topGalleries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No galleries yet</p>
            ) : (
              <div className="space-y-3">
                {data.topGalleries.map((gallery) => (
                  <div key={gallery.name} className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{gallery.name}</span>
                    <span className="flex items-center gap-3 text-muted-foreground font-mono tabular-nums text-xs">
                      <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{gallery.views}</span>
                      <span className="flex items-center gap-1"><Download className="h-3 w-3" />{gallery.downloads}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

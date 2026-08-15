'use server'

import { createClient } from '@/lib/supabase/server'
import { getStudioCurrency } from '@/lib/actions/studios'

export type AnalyticsRange = '7d' | '30d' | '90d' | '12m'

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
}

export interface AnalyticsSeriesPoint {
  label: string
  value: number
}

export interface AnalyticsData {
  currency: string
  stats: {
    totalRevenue: number
    revenueChangePercent: number | null
    bookings: number
    bookingsChangePercent: number | null
    activeClients: number
    galleryViews: number
    galleryDownloads: number
    outstandingInvoices: number
    avgOrderValue: number
    totalExpenses: number
    netProfit: number
  }
  revenueSeries: AnalyticsSeriesPoint[]
  bookingsSeries: AnalyticsSeriesPoint[]
  funnel: AnalyticsSeriesPoint[]
  clientSources: { label: string; value: number; percentage: number }[]
  topGalleries: { name: string; views: number; downloads: number }[]
}

function bucketLabel(date: Date, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'month') return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  if (granularity === 'week') return `Wk of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function bucketKey(date: Date, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'month') return `${date.getFullYear()}-${date.getMonth()}`
  if (granularity === 'week') {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    return weekStart.toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

/** Builds a zero-filled bucket series across the full range, then lets callers add into it. */
function buildEmptySeries(rangeStart: Date, now: Date, granularity: 'day' | 'week' | 'month'): Map<string, AnalyticsSeriesPoint> {
  const series = new Map<string, AnalyticsSeriesPoint>()
  const cursor = new Date(rangeStart)
  const stepDays = granularity === 'month' ? 30 : granularity === 'week' ? 7 : 1
  while (cursor <= now) {
    series.set(bucketKey(cursor, granularity), { label: bucketLabel(cursor, granularity), value: 0 })
    cursor.setDate(cursor.getDate() + stepDays)
  }
  return series
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/**
 * Real, computed analytics — replacing what was previously 100% Math.random()
 * mock data. Every number here comes from an actual table. Two things the
 * old mock showed are deliberately dropped rather than faked with a shaky
 * join: per-gallery revenue attribution (no gallery -> invoice link exists
 * in the schema) and website-visit analytics (no visitor tracking is
 * implemented). "Revenue" below means fully-settled invoices (paid_at set),
 * not partial deposits — outstandingInvoices covers the rest of the picture.
 */
export async function getAnalyticsOverview(studioSlug: string, range: AnalyticsRange): Promise<AnalyticsData | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id').eq('slug', studioSlug).single()
  if (!studio) return null

  const currency = await getStudioCurrency(studioSlug)

  const days = RANGE_DAYS[range]
  const now = new Date()
  const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const previousRangeStart = new Date(rangeStart.getTime() - days * 24 * 60 * 60 * 1000)
  const granularity: 'day' | 'week' | 'month' = days <= 30 ? 'day' : days <= 90 ? 'week' : 'month'

  const [
    { data: paidInvoicesCurrent },
    { data: paidInvoicesPrevious },
    { data: bookingsCurrent },
    { count: bookingsPrevious },
    { count: activeClients },
    { data: galleries },
    { data: outstandingInvoices },
    { data: orders },
    { count: leadsInPeriod },
    { count: quotesInPeriod },
    { count: contractsInPeriod },
    { count: confirmedBookingsInPeriod },
    { data: clientsWithSource },
    { data: expensesInPeriod },
  ] = await Promise.all([
    supabase.from('invoices').select('total, paid_at').eq('studio_id', studio.id).not('paid_at', 'is', null).gte('paid_at', rangeStart.toISOString()),
    supabase.from('invoices').select('total').eq('studio_id', studio.id).not('paid_at', 'is', null).gte('paid_at', previousRangeStart.toISOString()).lt('paid_at', rangeStart.toISOString()),
    supabase.from('bookings').select('id, created_at').eq('studio_id', studio.id).gte('created_at', rangeStart.toISOString()),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('studio_id', studio.id).gte('created_at', previousRangeStart.toISOString()).lt('created_at', rangeStart.toISOString()),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('studio_id', studio.id).eq('status', 'active'),
    supabase.from('galleries').select('name, view_count, download_count').eq('studio_id', studio.id).order('view_count', { ascending: false }).limit(5),
    supabase.from('invoices').select('total, amount_paid').eq('studio_id', studio.id).in('status', ['sent', 'partial', 'overdue']),
    supabase.from('orders').select('total').eq('studio_id', studio.id).eq('payment_status', 'paid'),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('studio_id', studio.id).eq('status', 'lead').gte('created_at', rangeStart.toISOString()),
    supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('studio_id', studio.id).neq('status', 'draft').gte('created_at', rangeStart.toISOString()),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('studio_id', studio.id).eq('status', 'signed').gte('created_at', rangeStart.toISOString()),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('studio_id', studio.id).eq('status', 'confirmed').gte('created_at', rangeStart.toISOString()),
    supabase.from('clients').select('source').eq('studio_id', studio.id).not('source', 'is', null),
    supabase.from('expenses').select('amount').eq('studio_id', studio.id).gte('expense_date', rangeStart.toISOString().slice(0, 10)),
  ])

  // Revenue
  const totalRevenue = (paidInvoicesCurrent ?? []).reduce((sum, inv) => sum + inv.total, 0)
  const previousRevenue = (paidInvoicesPrevious ?? []).reduce((sum, inv) => sum + inv.total, 0)
  const revenueSeriesMap = buildEmptySeries(rangeStart, now, granularity)
  for (const invoice of paidInvoicesCurrent ?? []) {
    if (!invoice.paid_at) continue
    const key = bucketKey(new Date(invoice.paid_at), granularity)
    const point = revenueSeriesMap.get(key)
    if (point) point.value += invoice.total
  }

  // Bookings
  const bookingsSeriesMap = buildEmptySeries(rangeStart, now, granularity)
  for (const booking of bookingsCurrent ?? []) {
    const key = bucketKey(new Date(booking.created_at), granularity)
    const point = bookingsSeriesMap.get(key)
    if (point) point.value += 1
  }

  // Galleries
  const galleryViews = (galleries ?? []).reduce((sum, g) => sum + (g.view_count ?? 0), 0)
  const galleryDownloads = (galleries ?? []).reduce((sum, g) => sum + (g.download_count ?? 0), 0)

  // Outstanding
  const outstandingTotal = (outstandingInvoices ?? []).reduce((sum, inv) => sum + Math.max(inv.total - inv.amount_paid, 0), 0)

  // Store
  const avgOrderValue = orders && orders.length > 0 ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0

  // Expenses / profit
  const totalExpenses = (expensesInPeriod ?? []).reduce((sum, e) => sum + e.amount, 0)
  const netProfit = totalRevenue - totalExpenses

  // Client sources
  const sourceCounts = new Map<string, number>()
  for (const client of clientsWithSource ?? []) {
    if (!client.source) continue
    sourceCounts.set(client.source, (sourceCounts.get(client.source) ?? 0) + 1)
  }
  const totalWithSource = Array.from(sourceCounts.values()).reduce((a, b) => a + b, 0)
  const clientSources = Array.from(sourceCounts.entries())
    .map(([label, value]) => ({ label, value, percentage: totalWithSource > 0 ? Math.round((value / totalWithSource) * 1000) / 10 : 0 }))
    .sort((a, b) => b.value - a.value)

  return {
    currency,
    stats: {
      totalRevenue,
      revenueChangePercent: percentChange(totalRevenue, previousRevenue),
      bookings: bookingsCurrent?.length ?? 0,
      bookingsChangePercent: percentChange(bookingsCurrent?.length ?? 0, bookingsPrevious ?? 0),
      activeClients: activeClients ?? 0,
      galleryViews,
      galleryDownloads,
      outstandingInvoices: outstandingTotal,
      avgOrderValue,
      totalExpenses,
      netProfit,
    },
    revenueSeries: Array.from(revenueSeriesMap.values()),
    bookingsSeries: Array.from(bookingsSeriesMap.values()),
    funnel: [
      { label: 'Leads', value: leadsInPeriod ?? 0 },
      { label: 'Quotes sent', value: quotesInPeriod ?? 0 },
      { label: 'Contracts signed', value: contractsInPeriod ?? 0 },
      { label: 'Bookings confirmed', value: confirmedBookingsInPeriod ?? 0 },
    ],
    clientSources,
    topGalleries: (galleries ?? []).map((g) => ({ name: g.name, views: g.view_count ?? 0, downloads: g.download_count ?? 0 })),
  }
}

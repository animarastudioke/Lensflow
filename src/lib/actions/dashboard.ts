'use server'

import { createClient } from '@/lib/supabase/server'

export interface DashboardStats {
  totalGalleries: number
  activeClients: number
  upcomingBookings: number
  monthlyRevenue: number
}

export async function getDashboardStats(studioSlug: string): Promise<DashboardStats> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) {
    return { totalGalleries: 0, activeClients: 0, upcomingBookings: 0, monthlyRevenue: 0 }
  }

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const [galleries, clients, bookings, invoices] = await Promise.all([
    supabase
      .from('galleries')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', studio.id)
      .neq('status', 'archived'),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', studio.id)
      .eq('status', 'active'),
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', studio.id)
      .gte('session_date', today)
      .not('status', 'in', '("cancelled","completed")'),
    supabase
      .from('invoices')
      .select('amount_paid')
      .eq('studio_id', studio.id)
      .gte('paid_at', monthStart)
      .not('paid_at', 'is', null),
  ])

  const monthlyRevenue = (invoices.data || []).reduce((sum, invoice) => sum + (invoice.amount_paid || 0), 0)

  return {
    totalGalleries: galleries.count || 0,
    activeClients: clients.count || 0,
    upcomingBookings: bookings.count || 0,
    monthlyRevenue,
  }
}

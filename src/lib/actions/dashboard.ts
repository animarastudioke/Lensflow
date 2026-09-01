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

export interface OverdueInvoiceSummary {
  id: string
  invoiceNumber: string
  clientName: string | null
  balanceDue: number
  dueDate: string | null
}

/**
 * Powers the dashboard's "needs attention" section. 'overdue' is a real,
 * stored invoices.status value (not computed client-side) -- the same
 * status the Invoices list itself already filters/counts on -- so this
 * is a direct, tenant-scoped read of existing data, not a new business
 * rule for what counts as overdue.
 */
export async function getOverdueInvoices(
  studioSlug: string,
  limit = 5
): Promise<{ invoices: OverdueInvoiceSummary[]; totalCount: number }> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return { invoices: [], totalCount: 0 }

  const { data, count } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, amount_paid, due_date, client:clients(name)', { count: 'exact' })
    .eq('studio_id', studio.id)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })
    .limit(limit)

  if (!data) return { invoices: [], totalCount: 0 }

  const invoices = data.map((invoice) => {
    const clientRaw = invoice.client as unknown as { name: string } | { name: string }[] | null
    const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      clientName: client?.name ?? null,
      balanceDue: invoice.total - invoice.amount_paid,
      dueDate: invoice.due_date,
    }
  })

  return { invoices, totalCount: count ?? invoices.length }
}

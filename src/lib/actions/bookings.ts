'use server'

import { createClient } from '@/lib/supabase/server'

export type BookingStatus = 'inquiry' | 'confirmed' | 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export interface BookingRow {
  id: string
  studio_id: string
  client_id: string | null
  session_name: string
  package_name: string | null
  type: string
  status: BookingStatus
  session_date: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  total_price: number
  deposit_amount: number
  deposit_paid: boolean
  balance_due: number
  notes: string | null
  created_at: string
  updated_at: string
  client: { name: string; email: string } | null
}

async function getStudioId(studioSlug: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()
  return studio?.id ?? null
}

export async function getBookings(studioSlug: string, options?: {
  status?: BookingStatus
}): Promise<{ bookings: BookingRow[]; total: number }> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return { bookings: [], total: 0 }

  let query = supabase
    .from('bookings')
    .select('*, client:clients(name, email)', { count: 'exact' })
    .eq('studio_id', studioId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  query = query.order('session_date', { ascending: false })

  const { data: bookings, count, error } = await query

  if (error) {
    console.error('Get bookings error:', error)
    return { bookings: [], total: 0 }
  }

  return { bookings: (bookings as unknown as BookingRow[]) || [], total: count || 0 }
}

export async function getUpcomingBookings(studioSlug: string, limit = 5): Promise<BookingRow[]> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return []

  const today = new Date().toISOString().slice(0, 10)

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, client:clients(name, email)')
    .eq('studio_id', studioId)
    .gte('session_date', today)
    .not('status', 'in', '("cancelled","completed")')
    .order('session_date', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Get upcoming bookings error:', error)
    return []
  }

  return (bookings as unknown as BookingRow[]) || []
}

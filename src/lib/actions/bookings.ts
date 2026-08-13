'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireEntitlement } from '@/lib/entitlements'

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

const bookingCreateSchema = z.object({
  session_name: z.string().min(1, 'Session name is required').max(100),
  client_id: z.string().uuid().optional(),
  package_name: z.string().max(100).optional(),
  type: z.enum(['wedding', 'portrait', 'engagement', 'family', 'corporate', 'event', 'other']),
  status: z.enum(['inquiry', 'confirmed', 'scheduled', 'completed', 'cancelled', 'no_show']).default('inquiry'),
  session_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().max(200).optional(),
  total_price: z.number().min(0).default(0),
  deposit_amount: z.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
})

export async function createBooking(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const studioSlug = formData.get('studio_slug') as string

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    throw new Error('No active studio membership')
  }

  await requireEntitlement(membership.studio_id, 'booking')

  const totalPriceRaw = formData.get('total_price')
  const depositAmountRaw = formData.get('deposit_amount')

  const rawData = {
    session_name: formData.get('session_name'),
    client_id: formData.get('client_id') || undefined,
    package_name: formData.get('package_name') || undefined,
    type: formData.get('type'),
    status: formData.get('status') || 'inquiry',
    session_date: formData.get('session_date') || undefined,
    start_time: formData.get('start_time') || undefined,
    end_time: formData.get('end_time') || undefined,
    location: formData.get('location') || undefined,
    total_price: totalPriceRaw ? Number(totalPriceRaw) : 0,
    deposit_amount: depositAmountRaw ? Number(depositAmountRaw) : 0,
    notes: formData.get('notes') || undefined,
  }

  const validated = bookingCreateSchema.parse(rawData)
  const balanceDue = Math.max(validated.total_price - validated.deposit_amount, 0)

  const { error } = await supabase
    .from('bookings')
    .insert({
      studio_id: membership.studio_id,
      client_id: validated.client_id,
      session_name: validated.session_name,
      package_name: validated.package_name,
      type: validated.type,
      status: validated.status,
      session_date: validated.session_date,
      start_time: validated.start_time,
      end_time: validated.end_time,
      location: validated.location,
      total_price: validated.total_price,
      deposit_amount: validated.deposit_amount,
      deposit_paid: false,
      balance_due: balanceDue,
      notes: validated.notes,
    })

  if (error) {
    console.error('Create booking error:', error)
    throw new Error('Failed to create booking')
  }

  const { createNotification } = await import('@/lib/actions/notifications')
  await createNotification(membership.studio_id, {
    type: 'booking_created',
    title: 'New booking',
    body: validated.session_name,
    link: `/dashboard/${studioSlug}/bookings`,
  })

  revalidatePath(`/dashboard/${studioSlug}/bookings`)
  redirect(`/dashboard/${studioSlug}/bookings`)
}

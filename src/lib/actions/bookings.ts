'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireEntitlement } from '@/lib/entitlements'
import { requireStudioPermission } from '@/lib/auth/server'
import { sendEmail } from '@/lib/email/resend'
import { bookingConfirmationEmail } from '@/lib/email/templates'
import { clientBelongsToStudio } from '@/lib/actions/clients'

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
  clientId?: string
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
  if (options?.clientId) {
    query = query.eq('client_id', options.clientId)
  }

  query = query.order('session_date', { ascending: false })

  const { data: bookings, count, error } = await query

  if (error) {
    console.error('Get bookings error:', error)
    return { bookings: [], total: 0 }
  }

  return { bookings: (bookings as unknown as BookingRow[]) || [], total: count || 0 }
}

/** Guards projects.booking_id the same way clientBelongsToStudio guards client_id -- see that function's doc comment. */
export async function bookingBelongsToStudio(bookingId: string, studioId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('studio_id', studioId)
    .single()

  return !!data
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
  const membership = await requireStudioPermission('bookings:create')
  if ('error' in membership) throw new Error(membership.error)

  const supabase = await createClient()

  const studioSlug = formData.get('studio_slug') as string

  await requireEntitlement(membership.studioId, 'booking')

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

  if (validated.client_id && !(await clientBelongsToStudio(validated.client_id, membership.studioId))) {
    throw new Error('Invalid client')
  }

  const balanceDue = Math.max(validated.total_price - validated.deposit_amount, 0)

  const { error } = await supabase
    .from('bookings')
    .insert({
      studio_id: membership.studioId,
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

  // Phase 12 Step 13: studioSlug above comes from client-submitted form
  // data, used only for revalidatePath (low-risk) -- but the notification
  // link should never be built from it, since a mismatched slug would send
  // the notification's own studio member to an unrelated URL. Re-derived
  // here from the already-trusted membership.studioId instead, matching
  // the server-resolved pattern the other producers already use.
  const { data: studioRow } = await supabase.from('studios').select('slug').eq('id', membership.studioId).single()
  const { createNotification } = await import('@/lib/actions/notifications')
  await createNotification(membership.studioId, {
    type: 'booking_created',
    title: 'New booking',
    body: validated.session_name,
    link: studioRow ? `/dashboard/${studioRow.slug}/bookings` : undefined,
  })

  if (validated.client_id) {
    const [{ data: client }, { data: studio }] = await Promise.all([
      supabase.from('clients').select('name, email').eq('id', validated.client_id).single(),
      supabase.from('studios').select('name, logo_url, brand_color').eq('id', membership.studioId).single(),
    ])
    if (client?.email && studio) {
      const { subject, html } = bookingConfirmationEmail({
        studio: { name: studio.name, logoUrl: studio.logo_url, brandColor: studio.brand_color },
        clientName: client.name,
        sessionName: validated.session_name,
        sessionDate: validated.session_date,
        location: validated.location,
      })
      const result = await sendEmail({ to: client.email, subject, html })
      if (!result.success) console.error('Failed to send booking confirmation email:', result.error)
    }
  }

  revalidatePath(`/dashboard/${studioSlug}/bookings`)
  redirect(`/dashboard/${studioSlug}/bookings`)
}

export async function getBooking(bookingId: string, studioSlug: string): Promise<BookingRow | null> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return null

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, client:clients(name, email)')
    .eq('id', bookingId)
    .eq('studio_id', studioId)
    .single()

  return (booking as unknown as BookingRow) ?? null
}

export async function updateBooking(formData: FormData) {
  const membership = await requireStudioPermission('bookings:update')
  if ('error' in membership) throw new Error(membership.error)

  const supabase = await createClient()

  const id = formData.get('id') as string
  const studioSlug = formData.get('studio_slug') as string

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

  if (validated.client_id && !(await clientBelongsToStudio(validated.client_id, membership.studioId))) {
    throw new Error('Invalid client')
  }

  const balanceDue = Math.max(validated.total_price - validated.deposit_amount, 0)

  const { error } = await supabase
    .from('bookings')
    .update({
      client_id: validated.client_id ?? null,
      session_name: validated.session_name,
      package_name: validated.package_name ?? null,
      type: validated.type,
      status: validated.status,
      session_date: validated.session_date ?? null,
      start_time: validated.start_time ?? null,
      end_time: validated.end_time ?? null,
      location: validated.location ?? null,
      total_price: validated.total_price,
      deposit_amount: validated.deposit_amount,
      balance_due: balanceDue,
      notes: validated.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update booking error:', error)
    throw new Error('Failed to update booking')
  }

  revalidatePath(`/dashboard/${studioSlug}/bookings`)
  revalidatePath(`/dashboard/${studioSlug}/bookings/${id}`)
  redirect(`/dashboard/${studioSlug}/bookings/${id}`)
}

export async function deleteBooking(bookingId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('bookings:delete')
  if ('error' in membership) return membership

  const supabase = await createClient()

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Delete booking error:', error)
    return { error: 'Failed to delete booking' }
  }

  revalidatePath(`/dashboard/${studioSlug}/bookings`)
}

export async function updateBookingStatus(
  bookingId: string,
  studioSlug: string,
  status: BookingStatus
): Promise<{ success: true } | { error: string }> {
  const membership = await requireStudioPermission('bookings:update')
  if ('error' in membership) return membership

  const supabase = await createClient()

  const { error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update booking status error:', error)
    return { error: 'Failed to update booking status' }
  }

  revalidatePath(`/dashboard/${studioSlug}/bookings`)
  revalidatePath(`/dashboard/${studioSlug}/bookings/${bookingId}`)
  return { success: true }
}

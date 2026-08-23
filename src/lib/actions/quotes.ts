'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireEntitlement } from '@/lib/entitlements'
import { requireStudioPermission } from '@/lib/auth/server'
import { sendEmail } from '@/lib/email/resend'
import { quoteSentEmail } from '@/lib/email/templates'

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'

export interface QuoteItemRow {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface QuoteRow {
  id: string
  studio_id: string
  client_id: string | null
  project_id: string | null
  quote_number: string
  title: string
  status: QuoteStatus
  issue_date: string
  expires_at: string | null
  subtotal: number
  tax: number
  discount: number
  total: number
  notes: string | null
  share_token: string | null
  created_at: string
  updated_at: string
  client: { name: string; email: string } | null
  items: QuoteItemRow[]
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

export async function getQuotes(studioSlug: string, options?: {
  status?: QuoteStatus
}): Promise<{ quotes: QuoteRow[]; total: number }> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return { quotes: [], total: 0 }

  let query = supabase
    .from('quotes')
    .select('*, client:clients(name, email), items:quote_items(*)', { count: 'exact' })
    .eq('studio_id', studioId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  query = query.order('issue_date', { ascending: false })

  const { data: quotes, count, error } = await query

  if (error) {
    console.error('Get quotes error:', error)
    return { quotes: [], total: 0 }
  }

  return { quotes: (quotes as unknown as QuoteRow[]) || [], total: count || 0 }
}

export async function getQuote(quoteId: string, studioSlug: string): Promise<QuoteRow | null> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return null

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, client:clients(name, email), items:quote_items(*)')
    .eq('id', quoteId)
    .eq('studio_id', studioId)
    .single()

  return quote as unknown as QuoteRow | null
}

export interface PublicQuote extends QuoteRow {
  studio: { name: string; logo_url: string | null; brand_color: string | null; email: string | null; phone: string | null; address: string | null }
  currency: string
}

/**
 * Public, unauthenticated lookup by share_token — see getInvoiceByToken for
 * the pattern this mirrors. Unlike invoices, quotes carry an expires_at
 * (set by the studio when sending the quote): once that date has passed,
 * the token stops resolving here entirely — fails closed for both this
 * page and the PDF route, which both call this and only this function,
 * rather than duplicating an expiry check in each caller. A null
 * expires_at means the quote was never given an expiry and keeps working
 * indefinitely, same as before this check existed.
 */
export async function getQuoteByToken(token: string): Promise<PublicQuote | null> {
  const { data, error } = await supabaseAdmin
    .from('quotes')
    .select('*, client:clients(name, email), items:quote_items(*), studio:studios(name, logo_url, brand_color, email, phone, address, currency)')
    .eq('share_token', token)
    .single()

  if (error || !data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  const studio = data.studio as unknown as { name: string; logo_url: string | null; brand_color: string | null; email: string | null; phone: string | null; address: string | null; currency: string }

  return { ...(data as unknown as QuoteRow), studio, currency: studio.currency }
}

function generateShareToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Invalidates the quote's current share link and issues a new one — see regenerateInvoiceShareToken for the pattern this mirrors. */
export async function regenerateQuoteShareToken(
  quoteId: string,
  studioSlug: string
): Promise<{ error: string } | { success: true; shareToken: string }> {
  const membership = await requireStudioPermission('quotes:update')
  if ('error' in membership) return membership

  const supabase = await createClient()
  const newToken = generateShareToken()

  const { data, error } = await supabase
    .from('quotes')
    .update({ share_token: newToken, updated_at: new Date().toISOString() })
    .eq('id', quoteId)
    .eq('studio_id', membership.studioId)
    .select('id')
    .single()

  if (error || !data) {
    console.error('Regenerate quote share token error:', error)
    return { error: 'Failed to regenerate share link' }
  }

  revalidatePath(`/dashboard/${studioSlug}/quotes/${quoteId}`)
  return { success: true, shareToken: newToken }
}

async function requireMembership(): Promise<{ error: string } | { studioId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return { error: 'No active studio membership' }

  return { studioId: membership.studio_id }
}

/** Best-effort — see sendInvoiceSentEmail in invoices.ts for the same reasoning. */
async function sendQuoteSentEmail(quoteId: string, studioId: string): Promise<void> {
  const { data: quote } = await supabaseAdmin
    .from('quotes')
    .select('quote_number, total, share_token, client:clients(name, email)')
    .eq('id', quoteId)
    .single()

  const client = quote?.client as unknown as { name: string; email: string } | null
  if (!quote || !client?.email || !quote.share_token) return

  const { data: studio } = await supabaseAdmin
    .from('studios')
    .select('name, logo_url, brand_color, currency')
    .eq('id', studioId)
    .single()
  if (!studio) return

  const { subject, html } = quoteSentEmail({
    studio: { name: studio.name, logoUrl: studio.logo_url, brandColor: studio.brand_color },
    clientName: client.name,
    quoteNumber: quote.quote_number,
    total: quote.total,
    currency: studio.currency,
    shareToken: quote.share_token,
  })

  const result = await sendEmail({ to: client.email, subject, html })
  if (!result.success) console.error('Failed to send quote-sent email:', result.error)
}

export async function updateQuoteStatus(
  quoteId: string,
  status: QuoteStatus,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('quotes:update')
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', quoteId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update quote status error:', error)
    return { error: 'Failed to update quote' }
  }

  if (status === 'sent') {
    await sendQuoteSentEmail(quoteId, membership.studioId)
  }

  revalidatePath(`/dashboard/${studioSlug}/quotes`)
}

export async function deleteQuote(quoteId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('quotes:delete')
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Delete quote error:', error)
    return { error: 'Failed to delete quote' }
  }

  revalidatePath(`/dashboard/${studioSlug}/quotes`)
}

const quoteItemSchema = z.object({
  description: z.string().min(1, 'Item description is required').max(200),
  quantity: z.number().min(0.01),
  unit_price: z.number().min(0),
})

const quoteCreateSchema = z.object({
  title: z.string().min(1, 'Quote title is required').max(150),
  client_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired']).default('draft'),
  issue_date: z.string().optional(),
  expires_at: z.string().optional(),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
  items: z.array(quoteItemSchema).min(1, 'Add at least one line item'),
})

export async function createQuote(formData: FormData) {
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

  await requireEntitlement(membership.studio_id, 'crm')

  let items: unknown
  try {
    items = JSON.parse((formData.get('items_json') as string) || '[]')
  } catch {
    throw new Error('Invalid line items')
  }

  const taxRaw = formData.get('tax')
  const discountRaw = formData.get('discount')

  const rawData = {
    title: formData.get('title'),
    client_id: formData.get('client_id') || undefined,
    status: formData.get('status') || 'draft',
    issue_date: formData.get('issue_date') || undefined,
    expires_at: formData.get('expires_at') || undefined,
    tax: taxRaw ? Number(taxRaw) : 0,
    discount: discountRaw ? Number(discountRaw) : 0,
    notes: formData.get('notes') || undefined,
    items,
  }

  const validated = quoteCreateSchema.parse(rawData)

  const subtotal = validated.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const total = Math.max(subtotal + validated.tax - validated.discount, 0)

  const { count } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', membership.studio_id)

  const quoteNumber = `QUO-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      studio_id: membership.studio_id,
      client_id: validated.client_id,
      quote_number: quoteNumber,
      title: validated.title,
      status: validated.status,
      issue_date: validated.issue_date || new Date().toISOString().slice(0, 10),
      expires_at: validated.expires_at,
      subtotal,
      tax: validated.tax,
      discount: validated.discount,
      total,
      notes: validated.notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Create quote error:', error)
    throw new Error('Failed to create quote')
  }

  const { error: itemsError } = await supabase
    .from('quote_items')
    .insert(
      validated.items.map(item => ({
        quote_id: quote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }))
    )

  if (itemsError) {
    console.error('Create quote items error:', itemsError)
    throw new Error('Failed to save quote line items')
  }

  if (validated.status === 'sent') {
    await sendQuoteSentEmail(quote.id, membership.studio_id)
  }

  revalidatePath(`/dashboard/${studioSlug}/quotes`)
  redirect(`/dashboard/${studioSlug}/quotes`)
}

const quoteUpdateSchema = z.object({
  title: z.string().min(1, 'Quote title is required').max(150),
  client_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired']),
  issue_date: z.string().optional(),
  expires_at: z.string().optional(),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
  items: z.array(quoteItemSchema).min(1, 'Add at least one line item'),
})

export async function updateQuote(formData: FormData) {
  const membership = await requireMembership()
  if ('error' in membership) throw new Error(membership.error)

  const id = formData.get('id') as string
  const studioSlug = formData.get('studio_slug') as string

  const { data: existing } = await (await createClient())
    .from('quotes')
    .select('id')
    .eq('id', id)
    .eq('studio_id', membership.studioId)
    .single()

  if (!existing) {
    throw new Error('Quote not found')
  }

  let items: unknown
  try {
    items = JSON.parse((formData.get('items_json') as string) || '[]')
  } catch {
    throw new Error('Invalid line items')
  }

  const taxRaw = formData.get('tax')
  const discountRaw = formData.get('discount')

  const validated = quoteUpdateSchema.parse({
    title: formData.get('title'),
    client_id: formData.get('client_id') || undefined,
    status: formData.get('status'),
    issue_date: formData.get('issue_date') || undefined,
    expires_at: formData.get('expires_at') || undefined,
    tax: taxRaw ? Number(taxRaw) : 0,
    discount: discountRaw ? Number(discountRaw) : 0,
    notes: formData.get('notes') || undefined,
    items,
  })

  const subtotal = validated.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const total = Math.max(subtotal + validated.tax - validated.discount, 0)

  const supabase = await createClient()

  const { error } = await supabase
    .from('quotes')
    .update({
      client_id: validated.client_id ?? null,
      title: validated.title,
      status: validated.status,
      issue_date: validated.issue_date || undefined,
      expires_at: validated.expires_at || null,
      subtotal,
      tax: validated.tax,
      discount: validated.discount,
      total,
      notes: validated.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update quote error:', error)
    throw new Error('Failed to update quote')
  }

  await supabase.from('quote_items').delete().eq('quote_id', id)

  const { error: itemsError } = await supabase
    .from('quote_items')
    .insert(
      validated.items.map(item => ({
        quote_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }))
    )

  if (itemsError) {
    console.error('Update quote items error:', itemsError)
    throw new Error('Failed to save quote line items')
  }

  revalidatePath(`/dashboard/${studioSlug}/quotes`)
  revalidatePath(`/dashboard/${studioSlug}/quotes/${id}`)
  redirect(`/dashboard/${studioSlug}/quotes/${id}`)
}

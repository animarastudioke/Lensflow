'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

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

  revalidatePath(`/dashboard/${studioSlug}/quotes`)
  redirect(`/dashboard/${studioSlug}/quotes`)
}

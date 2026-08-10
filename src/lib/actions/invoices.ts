'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded'

export interface InvoiceItemRow {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface InvoiceRow {
  id: string
  studio_id: string
  client_id: string | null
  project_id: string | null
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  paid_at: string | null
  subtotal: number
  tax: number
  discount: number
  total: number
  amount_paid: number
  notes: string | null
  created_at: string
  updated_at: string
  client: { name: string; email: string } | null
  items: InvoiceItemRow[]
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

export async function getInvoices(studioSlug: string, options?: {
  status?: InvoiceStatus
}): Promise<{ invoices: InvoiceRow[]; total: number }> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return { invoices: [], total: 0 }

  let query = supabase
    .from('invoices')
    .select('*, client:clients(name, email), items:invoice_items(*)', { count: 'exact' })
    .eq('studio_id', studioId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  query = query.order('issue_date', { ascending: false })

  const { data: invoices, count, error } = await query

  if (error) {
    console.error('Get invoices error:', error)
    return { invoices: [], total: 0 }
  }

  return { invoices: (invoices as unknown as InvoiceRow[]) || [], total: count || 0 }
}

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Item description is required').max(200),
  quantity: z.number().min(0.01),
  unit_price: z.number().min(0),
})

const invoiceCreateSchema = z.object({
  client_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled', 'refunded']).default('draft'),
  issue_date: z.string().optional(),
  due_date: z.string().optional(),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one line item'),
})

export async function createInvoice(formData: FormData) {
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
    client_id: formData.get('client_id') || undefined,
    status: formData.get('status') || 'draft',
    issue_date: formData.get('issue_date') || undefined,
    due_date: formData.get('due_date') || undefined,
    tax: taxRaw ? Number(taxRaw) : 0,
    discount: discountRaw ? Number(discountRaw) : 0,
    notes: formData.get('notes') || undefined,
    items,
  }

  const validated = invoiceCreateSchema.parse(rawData)

  const subtotal = validated.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const total = Math.max(subtotal + validated.tax - validated.discount, 0)

  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', membership.studio_id)

  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      studio_id: membership.studio_id,
      client_id: validated.client_id,
      invoice_number: invoiceNumber,
      status: validated.status,
      issue_date: validated.issue_date || new Date().toISOString().slice(0, 10),
      due_date: validated.due_date,
      subtotal,
      tax: validated.tax,
      discount: validated.discount,
      total,
      amount_paid: 0,
      notes: validated.notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Create invoice error:', error)
    throw new Error('Failed to create invoice')
  }

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(
      validated.items.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }))
    )

  if (itemsError) {
    console.error('Create invoice items error:', itemsError)
    throw new Error('Failed to save invoice line items')
  }

  revalidatePath(`/dashboard/${studioSlug}/invoices`)
  redirect(`/dashboard/${studioSlug}/invoices`)
}

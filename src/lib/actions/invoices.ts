'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireEntitlement } from '@/lib/entitlements'

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
  client: { name: string; email: string; phone: string | null } | null
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

export async function getInvoice(invoiceId: string, studioSlug: string): Promise<InvoiceRow | null> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return null

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, client:clients(name, email, phone), items:invoice_items(*)')
    .eq('id', invoiceId)
    .eq('studio_id', studioId)
    .single()

  return invoice as unknown as InvoiceRow | null
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

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()

  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'paid') {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total')
      .eq('id', invoiceId)
      .eq('studio_id', membership.studioId)
      .single()
    if (invoice) {
      update['amount_paid'] = invoice.total
    }
    update['paid_at'] = new Date().toISOString()
  }

  const { error } = await supabase
    .from('invoices')
    .update(update)
    .eq('id', invoiceId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update invoice status error:', error)
    return { error: 'Failed to update invoice' }
  }

  revalidatePath(`/dashboard/${studioSlug}/invoices`)
}

export async function bulkUpdateInvoiceStatus(
  invoiceIds: string[],
  status: InvoiceStatus,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()

  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'paid') {
    update['paid_at'] = new Date().toISOString()
  }

  const { error } = await supabase
    .from('invoices')
    .update(update)
    .eq('studio_id', membership.studioId)
    .in('id', invoiceIds)

  if (error) {
    console.error('Bulk update invoice status error:', error)
    return { error: 'Failed to update invoices' }
  }

  if (status === 'paid') {
    for (const id of invoiceIds) {
      const { data: invoice } = await supabase.from('invoices').select('total').eq('id', id).single()
      if (invoice) {
        await supabase.from('invoices').update({ amount_paid: invoice.total }).eq('id', id)
      }
    }
  }

  revalidatePath(`/dashboard/${studioSlug}/invoices`)
}

export async function deleteInvoice(invoiceId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Delete invoice error:', error)
    return { error: 'Failed to delete invoice' }
  }

  revalidatePath(`/dashboard/${studioSlug}/invoices`)
}

export async function bulkDeleteInvoices(invoiceIds: string[], studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('studio_id', membership.studioId)
    .in('id', invoiceIds)

  if (error) {
    console.error('Bulk delete invoices error:', error)
    return { error: 'Failed to delete invoices' }
  }

  revalidatePath(`/dashboard/${studioSlug}/invoices`)
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

  await requireEntitlement(membership.studio_id, 'payments')

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

const invoiceUpdateSchema = z.object({
  client_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled', 'refunded']),
  issue_date: z.string().optional(),
  due_date: z.string().optional(),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one line item'),
})

export async function updateInvoice(formData: FormData) {
  const membership = await requireMembership()
  if ('error' in membership) throw new Error(membership.error)

  const id = formData.get('id') as string
  const studioSlug = formData.get('studio_slug') as string

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('id', id)
    .eq('studio_id', membership.studioId)
    .single()

  if (!existing) {
    throw new Error('Invoice not found')
  }

  let items: unknown
  try {
    items = JSON.parse((formData.get('items_json') as string) || '[]')
  } catch {
    throw new Error('Invalid line items')
  }

  const taxRaw = formData.get('tax')
  const discountRaw = formData.get('discount')

  const validated = invoiceUpdateSchema.parse({
    client_id: formData.get('client_id') || undefined,
    status: formData.get('status'),
    issue_date: formData.get('issue_date') || undefined,
    due_date: formData.get('due_date') || undefined,
    tax: taxRaw ? Number(taxRaw) : 0,
    discount: discountRaw ? Number(discountRaw) : 0,
    notes: formData.get('notes') || undefined,
    items,
  })

  const subtotal = validated.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const total = Math.max(subtotal + validated.tax - validated.discount, 0)

  const { error } = await supabase
    .from('invoices')
    .update({
      client_id: validated.client_id ?? null,
      status: validated.status,
      issue_date: validated.issue_date || undefined,
      due_date: validated.due_date || null,
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
    console.error('Update invoice error:', error)
    throw new Error('Failed to update invoice')
  }

  await supabase.from('invoice_items').delete().eq('invoice_id', id)

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(
      validated.items.map(item => ({
        invoice_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }))
    )

  if (itemsError) {
    console.error('Update invoice items error:', itemsError)
    throw new Error('Failed to save invoice line items')
  }

  revalidatePath(`/dashboard/${studioSlug}/invoices`)
  revalidatePath(`/dashboard/${studioSlug}/invoices/${id}`)
  redirect(`/dashboard/${studioSlug}/invoices/${id}`)
}

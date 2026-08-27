'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireEntitlement } from '@/lib/entitlements'
import { requireStudioPermission } from '@/lib/auth/server'
import { sendEmail } from '@/lib/email/resend'
import { invoiceSentEmail } from '@/lib/email/templates'
import { clientBelongsToStudio } from '@/lib/actions/clients'

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
  share_token: string | null
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
  clientId?: string
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
  if (options?.clientId) {
    query = query.eq('client_id', options.clientId)
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

export interface PublicInvoice extends InvoiceRow {
  studio: { name: string; logo_url: string | null; brand_color: string | null; email: string | null; phone: string | null; address: string | null }
  currency: string
}

/**
 * Public, unauthenticated lookup by share_token — the same model as
 * getGalleryByToken and the questionnaire public-fill flow: a service-role
 * client, since there is no anon RLS policy on invoices by design.
 */
export async function getInvoiceByToken(token: string): Promise<PublicInvoice | null> {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*, client:clients(name, email, phone), items:invoice_items(*), studio:studios(name, logo_url, brand_color, email, phone, address, currency)')
    .eq('share_token', token)
    .single()

  if (error || !data) return null

  const studio = data.studio as unknown as { name: string; logo_url: string | null; brand_color: string | null; email: string | null; phone: string | null; address: string | null; currency: string }

  return { ...(data as unknown as InvoiceRow), studio, currency: studio.currency }
}

function generateShareToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Invalidates the invoice's current share link and issues a new one — same
 * "old token stops resolving, new token works immediately" contract as
 * galleries' regenerateShareToken, for when a link has leaked or a client
 * needs a fresh one. getInvoiceByToken and the PDF route both look up by
 * this column, so a single update covers both without further changes.
 */
export async function regenerateInvoiceShareToken(
  invoiceId: string,
  studioSlug: string
): Promise<{ error: string } | { success: true; shareToken: string }> {
  const membership = await requireStudioPermission('invoices:update')
  if ('error' in membership) return membership

  const supabase = await createClient()
  const newToken = generateShareToken()

  const { data, error } = await supabase
    .from('invoices')
    .update({ share_token: newToken, updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('studio_id', membership.studioId)
    .select('id')
    .single()

  if (error || !data) {
    console.error('Regenerate invoice share token error:', error)
    return { error: 'Failed to regenerate share link' }
  }

  revalidatePath(`/dashboard/${studioSlug}/invoices/${invoiceId}`)
  return { success: true, shareToken: newToken }
}

/**
 * Best-effort — a failed send should never block the invoice itself from
 * being marked sent, so this only ever logs, never throws or returns an
 * error the caller has to handle.
 */
async function sendInvoiceSentEmail(invoiceId: string, studioId: string): Promise<void> {
  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number, total, due_date, share_token, client:clients(name, email)')
    .eq('id', invoiceId)
    .single()

  const client = invoice?.client as unknown as { name: string; email: string } | null
  if (!invoice || !client?.email || !invoice.share_token) return

  const { data: studio } = await supabaseAdmin
    .from('studios')
    .select('name, logo_url, brand_color, currency')
    .eq('id', studioId)
    .single()
  if (!studio) return

  const { subject, html } = invoiceSentEmail({
    studio: { name: studio.name, logoUrl: studio.logo_url, brandColor: studio.brand_color },
    clientName: client.name,
    invoiceNumber: invoice.invoice_number,
    total: invoice.total,
    currency: studio.currency,
    dueDate: invoice.due_date,
    shareToken: invoice.share_token,
  })

  const result = await sendEmail({ to: client.email, subject, html })
  if (!result.success) console.error('Failed to send invoice-sent email:', result.error)
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  // Marking an invoice paid is a payments action (invoices:manage_payments),
  // distinct from other status changes (invoices:update) — a photographer
  // can move an invoice to 'sent'/'viewed' but can't record it as paid
  // outside a verified M-Pesa payment; only an owner/admin can.
  const membership = await requireStudioPermission(status === 'paid' ? 'invoices:manage_payments' : 'invoices:update')
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

  if (status === 'sent') {
    await sendInvoiceSentEmail(invoiceId, membership.studioId)
  }

  revalidatePath(`/dashboard/${studioSlug}/invoices`)
}

export async function bulkUpdateInvoiceStatus(
  invoiceIds: string[],
  status: InvoiceStatus,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission(status === 'paid' ? 'invoices:manage_payments' : 'invoices:update')
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
  const membership = await requireStudioPermission('invoices:delete')
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
  const membership = await requireStudioPermission('invoices:delete')
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
  const membership = await requireStudioPermission('invoices:create')
  if ('error' in membership) throw new Error(membership.error)

  const supabase = await createClient()

  const studioSlug = formData.get('studio_slug') as string

  await requireEntitlement(membership.studioId, 'payments')

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

  if (validated.client_id && !(await clientBelongsToStudio(validated.client_id, membership.studioId))) {
    throw new Error('Invalid client')
  }

  const subtotal = validated.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const total = Math.max(subtotal + validated.tax - validated.discount, 0)

  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', membership.studioId)

  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      studio_id: membership.studioId,
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

  if (validated.status === 'sent') {
    await sendInvoiceSentEmail(invoice.id, membership.studioId)
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
  const membership = await requireStudioPermission('invoices:update')
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

  if (validated.client_id && !(await clientBelongsToStudio(validated.client_id, membership.studioId))) {
    throw new Error('Invalid client')
  }

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

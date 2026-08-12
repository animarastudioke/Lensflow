'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireEntitlement } from '@/lib/entitlements'

export type ClientStatus = 'lead' | 'active' | 'inactive' | 'archived'

export interface ClientRow {
  id: string
  studio_id: string
  first_name: string
  last_name: string
  name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  country: string | null
  status: ClientStatus
  source: string | null
  tags: string[]
  total_spent: number
  total_orders: number
  last_contact: string | null
  created_at: string
  updated_at: string
}

export async function getClients(studioSlug: string, options?: {
  search?: string
  status?: ClientStatus
}): Promise<{ clients: ClientRow[]; total: number }> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return { clients: [], total: 0 }

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('studio_id', studio.id)

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%`)
  }
  if (options?.status) {
    query = query.eq('status', options.status)
  }

  query = query.order('created_at', { ascending: false })

  const { data: clients, count, error } = await query

  if (error) {
    console.error('Get clients error:', error)
    return { clients: [], total: 0 }
  }

  return { clients: clients || [], total: count || 0 }
}

export async function getClient(clientId: string, studioSlug: string): Promise<ClientRow | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('studio_id', studio.id)
    .single()

  return client
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

const clientSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().max(100).optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  status: z.enum(['lead', 'active', 'inactive', 'archived']).default('lead'),
  source: z.string().max(100).optional(),
})

export async function createClientRecord(formData: FormData) {
  const membership = await requireMembership()
  if ('error' in membership) throw new Error(membership.error)

  await requireEntitlement(membership.studioId, 'crm')

  const studioSlug = formData.get('studio_slug') as string

  const validated = clientSchema.parse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name') || undefined,
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    address: formData.get('address') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    zip_code: formData.get('zip_code') || undefined,
    country: formData.get('country') || undefined,
    status: formData.get('status') || 'lead',
    source: formData.get('source') || undefined,
  })

  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .insert({
      studio_id: membership.studioId,
      first_name: validated.first_name,
      last_name: validated.last_name ?? '',
      email: validated.email,
      phone: validated.phone,
      address: validated.address,
      city: validated.city,
      state: validated.state,
      zip_code: validated.zip_code,
      country: validated.country,
      status: validated.status,
      source: validated.source,
    })

  if (error) {
    console.error('Create client error:', error)
    throw new Error('Failed to create client')
  }

  const redirectPath = validated.status === 'lead' ? 'leads' : 'clients'
  revalidatePath(`/dashboard/${studioSlug}/clients`)
  revalidatePath(`/dashboard/${studioSlug}/leads`)
  redirect(`/dashboard/${studioSlug}/${redirectPath}`)
}

export async function updateClient(formData: FormData) {
  const membership = await requireMembership()
  if ('error' in membership) throw new Error(membership.error)

  const id = formData.get('id') as string
  const studioSlug = formData.get('studio_slug') as string

  const validated = clientSchema.parse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name') || undefined,
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    address: formData.get('address') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    zip_code: formData.get('zip_code') || undefined,
    country: formData.get('country') || undefined,
    status: formData.get('status'),
    source: formData.get('source') || undefined,
  })

  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      first_name: validated.first_name,
      last_name: validated.last_name ?? '',
      email: validated.email,
      phone: validated.phone ?? null,
      address: validated.address ?? null,
      city: validated.city ?? null,
      state: validated.state ?? null,
      zip_code: validated.zip_code ?? null,
      country: validated.country ?? null,
      status: validated.status,
      source: validated.source ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update client error:', error)
    throw new Error('Failed to update client')
  }

  revalidatePath(`/dashboard/${studioSlug}/clients`)
  revalidatePath(`/dashboard/${studioSlug}/clients/${id}`)
  revalidatePath(`/dashboard/${studioSlug}/leads`)
  redirect(`/dashboard/${studioSlug}/clients/${id}`)
}

export async function deleteClient(clientId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Delete client error:', error)
    return { error: 'Failed to delete client' }
  }

  revalidatePath(`/dashboard/${studioSlug}/clients`)
  revalidatePath(`/dashboard/${studioSlug}/leads`)
}

export async function bulkDeleteClients(clientIds: string[], studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('studio_id', membership.studioId)
    .in('id', clientIds)

  if (error) {
    console.error('Bulk delete clients error:', error)
    return { error: 'Failed to delete clients' }
  }

  revalidatePath(`/dashboard/${studioSlug}/clients`)
  revalidatePath(`/dashboard/${studioSlug}/leads`)
}

export async function setClientsStatus(
  clientIds: string[],
  status: ClientStatus,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('studio_id', membership.studioId)
    .in('id', clientIds)

  if (error) {
    console.error('Set clients status error:', error)
    return { error: 'Failed to update clients' }
  }

  revalidatePath(`/dashboard/${studioSlug}/clients`)
  revalidatePath(`/dashboard/${studioSlug}/leads`)
}

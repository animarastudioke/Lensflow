'use server'

import { createClient } from '@/lib/supabase/server'

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

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'completed' | 'expired' | 'declined' | 'cancelled'
export type SignerStatus = 'pending' | 'signed' | 'declined'

export interface ContractSignerRow {
  name: string
  email: string
  status: SignerStatus
  signed_at: string | null
}

export interface ContractRow {
  id: string
  studio_id: string
  client_id: string | null
  project_id: string | null
  title: string
  type: string
  status: ContractStatus
  template_id: string | null
  total_value: number
  deposit_required: number
  deposit_paid: number
  notes: string | null
  sent_at: string | null
  viewed_at: string | null
  signed_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  client: { name: string; email: string } | null
  signers: ContractSignerRow[]
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

export async function getContracts(studioSlug: string): Promise<{ contracts: ContractRow[]; total: number }> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return { contracts: [], total: 0 }

  const { data: contracts, count, error } = await supabase
    .from('contracts')
    .select('*, client:clients(name, email), signers:contract_signers(name, email, status, signed_at)', { count: 'exact' })
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get contracts error:', error)
    return { contracts: [], total: 0 }
  }

  return { contracts: (contracts as unknown as ContractRow[]) || [], total: count || 0 }
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

export async function updateContractStatus(
  contractId: string,
  studioSlug: string,
  status: ContractStatus
): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()

  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'sent') {
    update['sent_at'] = new Date().toISOString()
  }

  const { error } = await supabase
    .from('contracts')
    .update(update)
    .eq('id', contractId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update contract status error:', error)
    return { error: 'Failed to update contract' }
  }

  revalidatePath(`/dashboard/${studioSlug}/contracts`)
}

export async function deleteContract(contractId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()

  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', contractId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Delete contract error:', error)
    return { error: 'Failed to delete contract' }
  }

  revalidatePath(`/dashboard/${studioSlug}/contracts`)
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireEntitlement } from '@/lib/entitlements'
import { requireStudioPermission } from '@/lib/auth/server'

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

export async function getContract(contractId: string, studioSlug: string): Promise<ContractRow | null> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return null

  const { data: contract } = await supabase
    .from('contracts')
    .select('*, client:clients(name, email), signers:contract_signers(name, email, status, signed_at)')
    .eq('id', contractId)
    .eq('studio_id', studioId)
    .single()

  return contract as unknown as ContractRow | null
}

const createContractSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: z.string().min(1).default('other'),
  total_value: z.number().min(0).default(0),
  deposit_required: z.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
  expires_at: z.string().optional(),
})

export async function createContract(formData: FormData) {
  const membership = await requireStudioPermission('contracts:create')
  if ('error' in membership) throw new Error(membership.error)

  await requireEntitlement(membership.studioId, 'crm')

  const studioSlug = formData.get('studio_slug') as string
  const clientId = formData.get('client_id') as string | null
  const signerName = formData.get('signer_name') as string | null
  const signerEmail = formData.get('signer_email') as string | null

  const totalValueRaw = formData.get('total_value')
  const depositRequiredRaw = formData.get('deposit_required')

  const validated = createContractSchema.parse({
    title: formData.get('title'),
    type: formData.get('type') || 'other',
    total_value: totalValueRaw ? Number(totalValueRaw) : 0,
    deposit_required: depositRequiredRaw ? Number(depositRequiredRaw) : 0,
    notes: formData.get('notes') || undefined,
    expires_at: formData.get('expires_at') || undefined,
  })

  const supabase = await createClient()

  const { data: contract, error } = await supabase
    .from('contracts')
    .insert({
      studio_id: membership.studioId,
      client_id: clientId || null,
      title: validated.title,
      type: validated.type,
      total_value: validated.total_value,
      deposit_required: validated.deposit_required,
      notes: validated.notes,
      expires_at: validated.expires_at || null,
    })
    .select('id')
    .single()

  if (error || !contract) {
    console.error('Create contract error:', error)
    throw new Error('Failed to create contract')
  }

  if (signerName && signerEmail) {
    await supabase.from('contract_signers').insert({
      contract_id: contract.id,
      name: signerName,
      email: signerEmail,
      status: 'pending',
    })
  }

  revalidatePath(`/dashboard/${studioSlug}/contracts`)
  redirect(`/dashboard/${studioSlug}/contracts`)
}

const updateContractSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: z.string().min(1),
  total_value: z.number().min(0),
  deposit_required: z.number().min(0),
  notes: z.string().max(2000).optional(),
  expires_at: z.string().optional(),
})

export async function updateContract(formData: FormData) {
  const membership = await requireStudioPermission('contracts:update')
  if ('error' in membership) throw new Error(membership.error)

  const id = formData.get('id') as string
  const studioSlug = formData.get('studio_slug') as string
  const clientId = formData.get('client_id') as string | null

  const totalValueRaw = formData.get('total_value')
  const depositRequiredRaw = formData.get('deposit_required')

  const validated = updateContractSchema.parse({
    title: formData.get('title'),
    type: formData.get('type'),
    total_value: totalValueRaw ? Number(totalValueRaw) : 0,
    deposit_required: depositRequiredRaw ? Number(depositRequiredRaw) : 0,
    notes: formData.get('notes') || undefined,
    expires_at: formData.get('expires_at') || undefined,
  })

  const supabase = await createClient()
  const { error } = await supabase
    .from('contracts')
    .update({
      client_id: clientId || null,
      title: validated.title,
      type: validated.type,
      total_value: validated.total_value,
      deposit_required: validated.deposit_required,
      notes: validated.notes ?? null,
      expires_at: validated.expires_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update contract error:', error)
    throw new Error('Failed to update contract')
  }

  revalidatePath(`/dashboard/${studioSlug}/contracts`)
  revalidatePath(`/dashboard/${studioSlug}/contracts/${id}`)
  redirect(`/dashboard/${studioSlug}/contracts/${id}`)
}

export async function updateContractStatus(
  contractId: string,
  studioSlug: string,
  status: ContractStatus
): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('contracts:update')
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
  const membership = await requireStudioPermission('contracts:delete')
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

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireStudioPermission } from '@/lib/auth/server'

export type ProjectStatus = 'planning' | 'scheduled' | 'in_progress' | 'editing' | 'review' | 'delivered' | 'archived'

export interface ProjectRow {
  id: string
  studio_id: string
  client_id: string | null
  booking_id: string | null
  name: string
  type: string
  status: ProjectStatus
  location: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
  created_at: string
  updated_at: string
  client: { name: string; email: string } | null
}

export async function getProjects(studioSlug: string, options?: {
  status?: ProjectStatus
}): Promise<{ projects: ProjectRow[]; total: number }> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return { projects: [], total: 0 }

  let query = supabase
    .from('projects')
    .select('*, client:clients(name, email)', { count: 'exact' })
    .eq('studio_id', studio.id)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  query = query.order('created_at', { ascending: false })

  const { data: projects, count, error } = await query

  if (error) {
    console.error('Get projects error:', error)
    return { projects: [], total: 0 }
  }

  return { projects: (projects as unknown as ProjectRow[]) || [], total: count || 0 }
}

export interface ProjectFinancials {
  totalValue: number
  paidAmount: number
  balanceDue: number
}

// A project's financial figures come from the invoices billed against it - the
// actual billing record - rather than quotes (proposals) or contracts (agreed
// scope, which can change). Projects with no invoices yet genuinely have $0
// billed so far.
export async function getProjectFinancials(studioSlug: string): Promise<Record<string, ProjectFinancials>> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return {}

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('project_id, total, amount_paid')
    .eq('studio_id', studio.id)
    .not('project_id', 'is', null)

  if (error) {
    console.error('Get project financials error:', error)
    return {}
  }

  const result: Record<string, ProjectFinancials> = {}
  for (const invoice of invoices || []) {
    const projectId = invoice.project_id as string
    const entry = result[projectId] ?? { totalValue: 0, paidAmount: 0, balanceDue: 0 }
    entry.totalValue += invoice.total
    entry.paidAmount += invoice.amount_paid
    result[projectId] = entry
  }

  for (const projectId of Object.keys(result)) {
    const entry = result[projectId]
    if (entry) {
      entry.balanceDue = Math.max(entry.totalValue - entry.paidAmount, 0)
    }
  }

  return result
}


export async function deleteProject(projectId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('projects:delete')
  if ('error' in membership) return membership

  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Delete project error:', error)
    return { error: 'Failed to delete project' }
  }

  revalidatePath(`/dashboard/${studioSlug}/projects`)
}

export async function archiveProjects(projectIds: string[], studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('projects:delete')
  if ('error' in membership) return membership

  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('studio_id', membership.studioId)
    .in('id', projectIds)

  if (error) {
    console.error('Archive projects error:', error)
    return { error: 'Failed to archive projects' }
  }

  revalidatePath(`/dashboard/${studioSlug}/projects`)
}

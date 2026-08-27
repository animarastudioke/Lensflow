'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
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


export async function getProject(projectId: string, studioSlug: string): Promise<ProjectRow | null> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  const { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(name, email)')
    .eq('id', projectId)
    .eq('studio_id', studio.id)
    .single()

  return (project as unknown as ProjectRow) ?? null
}

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(150),
  client_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  type: z.enum(['wedding', 'portrait', 'engagement', 'family', 'corporate', 'event', 'commercial', 'other']),
  status: z.enum(['planning', 'scheduled', 'in_progress', 'editing', 'review', 'delivered', 'archived']).default('planning'),
  location: z.string().max(200).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().max(2000).optional(),
})

function parseProjectFormData(formData: FormData) {
  return projectSchema.parse({
    name: formData.get('name'),
    client_id: formData.get('client_id') || undefined,
    booking_id: formData.get('booking_id') || undefined,
    type: formData.get('type'),
    status: formData.get('status') || 'planning',
    location: formData.get('location') || undefined,
    start_date: formData.get('start_date') || undefined,
    end_date: formData.get('end_date') || undefined,
    description: formData.get('description') || undefined,
  })
}

export async function createProject(formData: FormData) {
  const membership = await requireStudioPermission('projects:create')
  if ('error' in membership) throw new Error(membership.error)

  const supabase = await createClient()
  const studioSlug = formData.get('studio_slug') as string
  const validated = parseProjectFormData(formData)

  const { data: inserted, error } = await supabase
    .from('projects')
    .insert({
      studio_id: membership.studioId,
      client_id: validated.client_id ?? null,
      booking_id: validated.booking_id ?? null,
      name: validated.name,
      type: validated.type,
      status: validated.status,
      location: validated.location ?? null,
      start_date: validated.start_date ?? null,
      end_date: validated.end_date ?? null,
      description: validated.description ?? null,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('Create project error:', error)
    throw new Error('Failed to create project')
  }

  revalidatePath(`/dashboard/${studioSlug}/projects`)
  redirect(`/dashboard/${studioSlug}/projects/${inserted.id}`)
}

export async function updateProject(formData: FormData) {
  const membership = await requireStudioPermission('projects:update')
  if ('error' in membership) throw new Error(membership.error)

  const supabase = await createClient()
  const id = formData.get('id') as string
  const studioSlug = formData.get('studio_slug') as string
  const validated = parseProjectFormData(formData)

  const { error } = await supabase
    .from('projects')
    .update({
      client_id: validated.client_id ?? null,
      booking_id: validated.booking_id ?? null,
      name: validated.name,
      type: validated.type,
      status: validated.status,
      location: validated.location ?? null,
      start_date: validated.start_date ?? null,
      end_date: validated.end_date ?? null,
      description: validated.description ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update project error:', error)
    throw new Error('Failed to update project')
  }

  revalidatePath(`/dashboard/${studioSlug}/projects`)
  revalidatePath(`/dashboard/${studioSlug}/projects/${id}`)
  redirect(`/dashboard/${studioSlug}/projects/${id}`)
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

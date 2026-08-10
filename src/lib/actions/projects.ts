'use server'

import { createClient } from '@/lib/supabase/server'

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

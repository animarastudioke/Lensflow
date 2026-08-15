'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface TaskRow {
  id: string
  studioId: string
  projectId: string | null
  projectName: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  completedAt: string | null
  createdAt: string
}

async function requireMembership(): Promise<{ error: string } | { userId: string; studioId: string }> {
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
  return { userId: user.id, studioId: membership.studio_id }
}

export async function getTasks(studioSlug: string): Promise<TaskRow[]> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id').eq('slug', studioSlug).single()
  if (!studio) return []

  const { data, error } = await supabase
    .from('tasks')
    .select('id, studio_id, project_id, title, description, status, priority, due_date, completed_at, created_at, project:projects(name)')
    .eq('studio_id', studio.id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((t) => ({
    id: t.id,
    studioId: t.studio_id,
    projectId: t.project_id,
    projectName: (t.project as unknown as { name: string } | null)?.name ?? null,
    title: t.title,
    description: t.description,
    status: t.status as TaskStatus,
    priority: t.priority as TaskPriority,
    dueDate: t.due_date,
    completedAt: t.completed_at,
    createdAt: t.created_at,
  }))
}

const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().optional(),
  project_id: z.string().uuid().optional(),
})

export async function createTask(
  studioSlug: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const parsed = taskCreateSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    priority: formData.get('priority') || 'medium',
    due_date: formData.get('due_date') || undefined,
    project_id: formData.get('project_id') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').insert({
    studio_id: membership.studioId,
    project_id: parsed.data.project_id ?? null,
    created_by: membership.userId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    priority: parsed.data.priority,
    due_date: parsed.data.due_date ?? null,
  })

  if (error) {
    console.error('Create task error:', error)
    return { error: 'Failed to create task' }
  }

  revalidatePath(`/dashboard/${studioSlug}/tasks`)
  return { success: true }
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  studioSlug: string
): Promise<{ error: string } | { success: true }> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('studio_id', membership.studioId)

  if (error) return { error: 'Failed to update task' }
  revalidatePath(`/dashboard/${studioSlug}/tasks`)
  return { success: true }
}

export async function deleteTask(taskId: string, studioSlug: string): Promise<{ error: string } | { success: true }> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('studio_id', membership.studioId)

  if (error) return { error: 'Failed to delete task' }
  revalidatePath(`/dashboard/${studioSlug}/tasks`)
  return { success: true }
}

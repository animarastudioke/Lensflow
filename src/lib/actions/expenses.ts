'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getStudioCurrency } from '@/lib/actions/studios'
import { requireStudioPermission } from '@/lib/auth/server'

export type ExpenseCategory =
  | 'equipment'
  | 'software'
  | 'travel'
  | 'marketing'
  | 'venue'
  | 'staff'
  | 'supplies'
  | 'other'

export interface ExpenseRow {
  id: string
  studioId: string
  projectId: string | null
  projectName: string | null
  category: ExpenseCategory
  vendor: string | null
  description: string | null
  amount: number
  currency: string
  expenseDate: string
  receiptUrl: string | null
  createdAt: string
}

export async function getExpenses(studioSlug: string): Promise<ExpenseRow[]> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id').eq('slug', studioSlug).single()
  if (!studio) return []

  const { data, error } = await supabase
    .from('expenses')
    .select('id, studio_id, project_id, category, vendor, description, amount, currency, expense_date, receipt_url, created_at, project:projects(name)')
    .eq('studio_id', studio.id)
    .order('expense_date', { ascending: false })

  if (error || !data) return []

  return data.map((e) => ({
    id: e.id,
    studioId: e.studio_id,
    projectId: e.project_id,
    projectName: (e.project as unknown as { name: string } | null)?.name ?? null,
    category: e.category as ExpenseCategory,
    vendor: e.vendor,
    description: e.description,
    amount: e.amount,
    currency: e.currency,
    expenseDate: e.expense_date,
    receiptUrl: e.receipt_url,
    createdAt: e.created_at,
  }))
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['equipment', 'software', 'travel', 'marketing', 'venue', 'staff', 'supplies', 'other']

const expenseCreateSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]).default('other'),
  vendor: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  expense_date: z.string().optional(),
  project_id: z.string().uuid().optional(),
})

export async function createExpense(
  studioSlug: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const membership = await requireStudioPermission('expenses:create')
  if ('error' in membership) return membership

  const parsed = expenseCreateSchema.safeParse({
    category: formData.get('category') || 'other',
    vendor: formData.get('vendor') || undefined,
    description: formData.get('description') || undefined,
    amount: formData.get('amount'),
    expense_date: formData.get('expense_date') || undefined,
    project_id: formData.get('project_id') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const currency = await getStudioCurrency(studioSlug)

  const { error } = await supabase.from('expenses').insert({
    studio_id: membership.studioId,
    project_id: parsed.data.project_id ?? null,
    created_by: membership.userId,
    category: parsed.data.category,
    vendor: parsed.data.vendor ?? null,
    description: parsed.data.description ?? null,
    amount: parsed.data.amount,
    currency,
    expense_date: parsed.data.expense_date ?? new Date().toISOString().slice(0, 10),
  })

  if (error) {
    console.error('Create expense error:', error)
    return { error: 'Failed to create expense' }
  }

  revalidatePath(`/dashboard/${studioSlug}/expenses`)
  return { success: true }
}

export async function deleteExpense(expenseId: string, studioSlug: string): Promise<{ error: string } | { success: true }> {
  const membership = await requireStudioPermission('expenses:delete')
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId).eq('studio_id', membership.studioId)

  if (error) return { error: 'Failed to delete expense' }
  revalidatePath(`/dashboard/${studioSlug}/expenses`)
  return { success: true }
}

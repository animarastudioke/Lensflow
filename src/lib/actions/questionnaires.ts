'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type QuestionnaireFieldType =
  | 'text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'number'
  | 'dropdown'
  | 'checkbox'
  | 'radio'
  | 'file_upload'
  | 'signature'

export interface QuestionnaireField {
  id: string
  type: QuestionnaireFieldType
  label: string
  required: boolean
  options?: string[]
}

export interface QuestionnaireTemplateRow {
  id: string
  studioId: string
  name: string
  description: string | null
  fields: QuestionnaireField[]
  responseCount: number
  createdAt: string
  updatedAt: string
}

export interface QuestionnaireResponseRow {
  id: string
  templateId: string
  clientId: string | null
  clientName: string | null
  shareToken: string
  answers: Record<string, unknown>
  submittedAt: string | null
  createdAt: string
}

function generateShareToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
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

export async function getTemplates(studioSlug: string): Promise<QuestionnaireTemplateRow[]> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id').eq('slug', studioSlug).single()
  if (!studio) return []

  const { data, error } = await supabase
    .from('questionnaire_templates')
    .select('id, studio_id, name, description, fields, created_at, updated_at, responses:questionnaire_responses(count)')
    .eq('studio_id', studio.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((t) => ({
    id: t.id,
    studioId: t.studio_id,
    name: t.name,
    description: t.description,
    fields: (t.fields as QuestionnaireField[]) ?? [],
    responseCount: (t.responses as unknown as { count: number }[])[0]?.count ?? 0,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }))
}

export async function getTemplate(studioSlug: string, templateId: string): Promise<QuestionnaireTemplateRow | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id').eq('slug', studioSlug).single()
  if (!studio) return null

  const { data, error } = await supabase
    .from('questionnaire_templates')
    .select('id, studio_id, name, description, fields, created_at, updated_at')
    .eq('id', templateId)
    .eq('studio_id', studio.id)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    studioId: data.studio_id,
    name: data.name,
    description: data.description,
    fields: (data.fields as QuestionnaireField[]) ?? [],
    responseCount: 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

const templateCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
})

export async function createTemplate(
  studioSlug: string,
  formData: FormData
): Promise<{ error: string } | { success: true; templateId: string }> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const parsed = templateCreateSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questionnaire_templates')
    .insert({
      studio_id: membership.studioId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      fields: [],
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Create template error:', error)
    return { error: 'Failed to create template' }
  }

  revalidatePath(`/dashboard/${studioSlug}/questionnaires`)
  return { success: true, templateId: data.id }
}

export async function updateTemplateFields(
  templateId: string,
  studioSlug: string,
  fields: QuestionnaireField[]
): Promise<{ error: string } | { success: true }> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('questionnaire_templates')
    .update({ fields, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('studio_id', membership.studioId)

  if (error) return { error: 'Failed to save fields' }
  revalidatePath(`/dashboard/${studioSlug}/questionnaires/${templateId}`)
  return { success: true }
}

export async function deleteTemplate(templateId: string, studioSlug: string): Promise<{ error: string } | { success: true }> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('questionnaire_templates')
    .delete()
    .eq('id', templateId)
    .eq('studio_id', membership.studioId)

  if (error) return { error: 'Failed to delete template' }
  revalidatePath(`/dashboard/${studioSlug}/questionnaires`)
  return { success: true }
}

export async function sendQuestionnaire(
  templateId: string,
  studioSlug: string,
  clientId: string | null
): Promise<{ error: string } | { success: true; shareToken: string }> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { data: template } = await supabase
    .from('questionnaire_templates')
    .select('id')
    .eq('id', templateId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!template) return { error: 'Template not found' }

  const shareToken = generateShareToken()
  const { error } = await supabase.from('questionnaire_responses').insert({
    template_id: templateId,
    studio_id: membership.studioId,
    client_id: clientId,
    share_token: shareToken,
    answers: {},
  })

  if (error) {
    console.error('Send questionnaire error:', error)
    return { error: 'Failed to create questionnaire link' }
  }

  revalidatePath(`/dashboard/${studioSlug}/questionnaires/${templateId}`)
  return { success: true, shareToken }
}

export async function getResponses(studioSlug: string, templateId: string): Promise<QuestionnaireResponseRow[]> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id').eq('slug', studioSlug).single()
  if (!studio) return []

  const { data, error } = await supabase
    .from('questionnaire_responses')
    .select('id, template_id, client_id, share_token, answers, submitted_at, created_at, client:clients(name)')
    .eq('template_id', templateId)
    .eq('studio_id', studio.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((r) => ({
    id: r.id,
    templateId: r.template_id,
    clientId: r.client_id,
    clientName: (r.client as unknown as { name: string } | null)?.name ?? null,
    shareToken: r.share_token,
    answers: (r.answers as Record<string, unknown>) ?? {},
    submittedAt: r.submitted_at,
    createdAt: r.created_at,
  }))
}

export interface PublicQuestionnaire {
  templateName: string
  templateDescription: string | null
  studioName: string
  fields: QuestionnaireField[]
  answers: Record<string, unknown>
  submittedAt: string | null
}

/**
 * Public fill-out access goes through the service-role client, matching the
 * gallery share-link pattern -- there is no anon RLS policy on
 * questionnaire_responses by design, so a bare token lookup with no
 * authenticated session has to happen here.
 */
export async function getPublicQuestionnaire(token: string): Promise<PublicQuestionnaire | null> {
  const { data: response, error } = await supabaseAdmin
    .from('questionnaire_responses')
    .select('answers, submitted_at, template:questionnaire_templates(name, description, fields, studio:studios(name))')
    .eq('share_token', token)
    .single()

  if (error || !response) return null

  const template = response.template as unknown as {
    name: string
    description: string | null
    fields: QuestionnaireField[]
    studio: { name: string } | null
  }

  return {
    templateName: template.name,
    templateDescription: template.description,
    studioName: template.studio?.name ?? 'Studio',
    fields: template.fields ?? [],
    answers: (response.answers as Record<string, unknown>) ?? {},
    submittedAt: response.submitted_at,
  }
}

export async function submitQuestionnaireResponse(
  token: string,
  answers: Record<string, unknown>
): Promise<{ error: string } | { success: true }> {
  const { data: existing } = await supabaseAdmin
    .from('questionnaire_responses')
    .select('id, submitted_at')
    .eq('share_token', token)
    .single()

  if (!existing) return { error: 'Questionnaire not found' }
  if (existing.submitted_at) return { error: 'This questionnaire has already been submitted' }

  const { error } = await supabaseAdmin
    .from('questionnaire_responses')
    .update({ answers, submitted_at: new Date().toISOString() })
    .eq('id', existing.id)
    .is('submitted_at', null)

  if (error) {
    console.error('Submit questionnaire error:', error)
    return { error: 'Failed to submit questionnaire' }
  }

  return { success: true }
}

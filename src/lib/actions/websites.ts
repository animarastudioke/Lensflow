'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { hasEntitlement, requireEntitlement } from '@/lib/entitlements'

export type WebsiteStatus = 'published' | 'draft' | 'archived'

export interface WebsitePageRow {
  id: string
  website_id: string
  name: string
  path: string
  is_published: boolean
  content: Record<string, unknown>
  order: number
  created_at: string
  updated_at: string
}

export interface WebsiteRow {
  id: string
  studio_id: string
  name: string
  subdomain: string
  custom_domain: string | null
  status: WebsiteStatus
  template: string
  template_name: string | null
  theme: { primaryColor?: string; font?: string }
  seo: { title?: string; description?: string }
  ssl_enabled: boolean
  password_protected: boolean
  visits: number
  unique_visitors: number
  published_at: string | null
  created_at: string
  updated_at: string
  pages?: WebsitePageRow[]
}

const TEMPLATES = [
  { value: 'modern-minimal', label: 'Modern Minimal' },
  { value: 'elegant-wedding', label: 'Elegant Wedding' },
  { value: 'bold-editorial', label: 'Bold Editorial' },
] as const

export async function getWebsiteTemplates() {
  return TEMPLATES
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

export async function getWebsites(studioSlug: string): Promise<{ websites: WebsiteRow[]; total: number }> {
  const supabase = await createClient()
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return { websites: [], total: 0 }

  const { data: websites, count, error } = await supabase
    .from('websites')
    .select('*, pages:website_pages(*)', { count: 'exact' })
    .eq('studio_id', studio.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get websites error:', error)
    return { websites: [], total: 0 }
  }

  return { websites: (websites as unknown as WebsiteRow[]) || [], total: count || 0 }
}

export async function getWebsite(websiteId: string, studioSlug: string): Promise<WebsiteRow | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  const { data: website } = await supabase
    .from('websites')
    .select('*, pages:website_pages(*)')
    .eq('id', websiteId)
    .eq('studio_id', studio.id)
    .single()

  return website as unknown as WebsiteRow | null
}

const createWebsiteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  template: z.string().min(1),
})

export async function createWebsite(formData: FormData) {
  const membership = await requireMembership()
  if ('error' in membership) throw new Error(membership.error)

  await requireEntitlement(membership.studioId, 'website_builder')

  const studioSlug = formData.get('studio_slug') as string
  const template = (formData.get('template') as string) || TEMPLATES[0].value
  const templateName = TEMPLATES.find(t => t.value === template)?.label || TEMPLATES[0].label

  const validated = createWebsiteSchema.parse({
    name: formData.get('name'),
    subdomain: formData.get('subdomain'),
    template,
  })

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('websites')
    .select('id')
    .eq('subdomain', validated.subdomain)
    .maybeSingle()

  if (existing) {
    throw new Error('That subdomain is already taken')
  }

  const { data: website, error } = await supabase
    .from('websites')
    .insert({
      studio_id: membership.studioId,
      name: validated.name,
      subdomain: validated.subdomain,
      template: validated.template,
      template_name: templateName,
    })
    .select('id')
    .single()

  if (error || !website) {
    console.error('Create website error:', error)
    throw new Error('Failed to create website')
  }

  await supabase.from('website_pages').insert({
    website_id: website.id,
    name: 'Home',
    path: '/',
    order: 0,
  })

  revalidatePath(`/dashboard/${studioSlug}/website`)
  redirect(`/dashboard/${studioSlug}/website/${website.id}/editor`)
}

export async function deleteWebsite(websiteId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('websites')
    .delete()
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Delete website error:', error)
    return { error: 'Failed to delete website' }
  }

  revalidatePath(`/dashboard/${studioSlug}/website`)
}

export async function bulkDeleteWebsites(websiteIds: string[], studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { error } = await supabase
    .from('websites')
    .delete()
    .eq('studio_id', membership.studioId)
    .in('id', websiteIds)

  if (error) {
    console.error('Bulk delete websites error:', error)
    return { error: 'Failed to delete websites' }
  }

  revalidatePath(`/dashboard/${studioSlug}/website`)
}

export async function setWebsiteStatus(
  websiteId: string,
  status: WebsiteStatus,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  if (status === 'published' && !(await hasEntitlement(membership.studioId, 'website_builder'))) {
    return { error: 'Publishing a website requires an upgraded plan.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('websites')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Set website status error:', error)
    return { error: 'Failed to update website' }
  }

  revalidatePath(`/dashboard/${studioSlug}/website`)
}

export async function bulkSetWebsiteStatus(
  websiteIds: string[],
  status: WebsiteStatus,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  if (status === 'published' && !(await hasEntitlement(membership.studioId, 'website_builder'))) {
    return { error: 'Publishing a website requires an upgraded plan.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('websites')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('studio_id', membership.studioId)
    .in('id', websiteIds)

  if (error) {
    console.error('Bulk set website status error:', error)
    return { error: 'Failed to update websites' }
  }

  revalidatePath(`/dashboard/${studioSlug}/website`)
}

export async function duplicateWebsite(websiteId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { data: original } = await supabase
    .from('websites')
    .select('*, pages:website_pages(*)')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!original) return { error: 'Website not found' }

  const baseSubdomain = `${original.subdomain}-copy`
  let subdomain = baseSubdomain
  let suffix = 1
  while (true) {
    const { data: taken } = await supabase.from('websites').select('id').eq('subdomain', subdomain).maybeSingle()
    if (!taken) break
    suffix += 1
    subdomain = `${baseSubdomain}-${suffix}`
  }

  const { data: copy, error } = await supabase
    .from('websites')
    .insert({
      studio_id: membership.studioId,
      name: `${original.name} (Copy)`,
      subdomain,
      template: original.template,
      template_name: original.template_name,
      theme: original.theme,
      seo: original.seo,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !copy) {
    console.error('Duplicate website error:', error)
    return { error: 'Failed to duplicate website' }
  }

  const pages = (original.pages as { name: string; path: string; order: number; content: unknown }[]) || []
  if (pages.length > 0) {
    await supabase.from('website_pages').insert(
      pages.map(p => ({
        website_id: copy.id,
        name: p.name,
        path: p.path,
        order: p.order,
        content: p.content,
        is_published: false,
      }))
    )
  }

  revalidatePath(`/dashboard/${studioSlug}/website`)
}

const updateWebsiteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  custom_domain: z.string().max(255).optional(),
  primary_color: z.string().max(20).optional(),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(500).optional(),
  password_protected: z.boolean(),
})

export async function updateWebsiteSettings(formData: FormData) {
  const membership = await requireMembership()
  if ('error' in membership) throw new Error(membership.error)

  const websiteId = formData.get('id') as string
  const studioSlug = formData.get('studio_slug') as string

  const validated = updateWebsiteSchema.parse({
    name: formData.get('name'),
    custom_domain: formData.get('custom_domain') || undefined,
    primary_color: formData.get('primary_color') || undefined,
    seo_title: formData.get('seo_title') || undefined,
    seo_description: formData.get('seo_description') || undefined,
    password_protected: formData.get('password_protected') === 'true',
  })

  if (validated.custom_domain && !(await hasEntitlement(membership.studioId, 'custom_domain'))) {
    throw new Error('Custom domains require an upgraded plan.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('websites')
    .update({
      name: validated.name,
      custom_domain: validated.custom_domain || null,
      theme: { primaryColor: validated.primary_color || undefined },
      seo: { title: validated.seo_title, description: validated.seo_description },
      password_protected: validated.password_protected,
      updated_at: new Date().toISOString(),
    })
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update website settings error:', error)
    throw new Error('Failed to update website')
  }

  revalidatePath(`/dashboard/${studioSlug}/website/${websiteId}/editor`)
}

const addPageSchema = z.object({
  name: z.string().min(1, 'Page name is required').max(100),
  path: z
    .string()
    .min(1, 'Path is required')
    .regex(/^\/[a-z0-9-/]*$/, 'Path must start with / and use lowercase letters, numbers, and hyphens'),
})

export async function addWebsitePage(formData: FormData) {
  const membership = await requireMembership()
  if ('error' in membership) throw new Error(membership.error)

  const websiteId = formData.get('website_id') as string
  const studioSlug = formData.get('studio_slug') as string

  const validated = addPageSchema.parse({
    name: formData.get('name'),
    path: formData.get('path'),
  })

  const supabase = await createClient()
  const { data: website } = await supabase
    .from('websites')
    .select('id')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!website) throw new Error('Website not found')

  const { count } = await supabase
    .from('website_pages')
    .select('id', { count: 'exact', head: true })
    .eq('website_id', websiteId)

  const { error } = await supabase.from('website_pages').insert({
    website_id: websiteId,
    name: validated.name,
    path: validated.path,
    order: count || 0,
  })

  if (error) {
    console.error('Add website page error:', error)
    throw new Error('Failed to add page')
  }

  revalidatePath(`/dashboard/${studioSlug}/website/${websiteId}/editor`)
}

export async function setPagePublished(
  pageId: string,
  isPublished: boolean,
  websiteId: string,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { data: website } = await supabase
    .from('websites')
    .select('id')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!website) return { error: 'Website not found' }

  const { error } = await supabase
    .from('website_pages')
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq('id', pageId)
    .eq('website_id', websiteId)

  if (error) {
    console.error('Set page published error:', error)
    return { error: 'Failed to update page' }
  }

  revalidatePath(`/dashboard/${studioSlug}/website/${websiteId}/editor`)
}

export async function deleteWebsitePage(
  pageId: string,
  websiteId: string,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireMembership()
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { data: website } = await supabase
    .from('websites')
    .select('id')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!website) return { error: 'Website not found' }

  const { error } = await supabase
    .from('website_pages')
    .delete()
    .eq('id', pageId)
    .eq('website_id', websiteId)

  if (error) {
    console.error('Delete website page error:', error)
    return { error: 'Failed to delete page' }
  }

  revalidatePath(`/dashboard/${studioSlug}/website/${websiteId}/editor`)
}

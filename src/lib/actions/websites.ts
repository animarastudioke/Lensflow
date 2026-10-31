'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { hasEntitlement, requireEntitlement } from '@/lib/entitlements'
import { requireStudioPermission } from '@/lib/auth/server'
import { DEFAULT_TEMPLATE_ID, SERVICE_IDS, TEMPLATES, TEMPLATE_IDS, getTemplate } from '@/lib/website/templates'
import { websiteSectionsSchema } from '@/lib/website/section-schema'
import { getWebsiteGalleryOptions as loadWebsiteGalleryOptions } from '@/lib/website/galleries'

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
  studio?: { name: string; logo_url: string | null } | null
  pages?: WebsitePageRow[]
}

// Kept for callers that only need id/label pairs; the registry in
// src/lib/website/templates.ts is the single source of truth.
export async function getWebsiteTemplates() {
  return TEMPLATES.map((template) => ({ value: template.id, label: template.label }))
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
    .select('*, studio:studios(name, logo_url), pages:website_pages(*)')
    .eq('id', websiteId)
    .eq('studio_id', studio.id)
    .single()

  return website as unknown as WebsiteRow | null
}

export async function getWebsitePage(
  pageId: string,
  websiteId: string,
  studioSlug: string
): Promise<{ website: WebsiteRow; page: WebsitePageRow } | null> {
  const website = await getWebsite(websiteId, studioSlug)
  if (!website) return null

  const page = (website.pages ?? []).find((p) => p.id === pageId)
  if (!page) return null

  return { website, page }
}

export async function getWebsiteGalleries(websiteId: string, studioSlug: string) {
  const website = await getWebsite(websiteId, studioSlug)
  if (!website) return []
  const supabase = await createClient()
  return loadWebsiteGalleryOptions(supabase, website.studio_id)
}

const createWebsiteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  template: z.enum(TEMPLATE_IDS),
  // Only used to pick a default in the picker; never stored.
  service: z.enum(SERVICE_IDS).optional(),
})

export async function createWebsite(formData: FormData) {
  const membership = await requireStudioPermission('website:create')
  if ('error' in membership) throw new Error(membership.error)

  await requireEntitlement(membership.studioId, 'website_builder')

  const studioSlug = formData.get('studio_slug') as string
  const template = (formData.get('template') as string) || DEFAULT_TEMPLATE_ID

  const validated = createWebsiteSchema.parse({
    name: formData.get('name'),
    subdomain: formData.get('subdomain'),
    template,
    service: formData.get('service') || undefined,
  })
  const chosenTemplate = getTemplate(validated.template)
  const templateName = chosenTemplate.label

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('websites')
    .select('id')
    .eq('subdomain', validated.subdomain)
    .maybeSingle()

  if (existing) {
    return { error: 'That subdomain is already taken. Choose a different one to continue.' }
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
    if (error?.code === '23505') {
      return { error: 'That subdomain is already taken. Choose a different one to continue.' }
    }
    throw new Error('Failed to create website')
  }

  // Starter content comes only from the server-side registry, never the client.
  // is_published is left to the column default (false) exactly as the old
  // single-Home insert did: every starter page stays a draft until the studio
  // has edited and published it.
  const { error: homePageError } = await supabase.from('website_pages').insert(
    chosenTemplate.starterPages(validated.name).map((page, index) => ({
      website_id: website.id,
      name: page.name,
      path: page.path,
      order: index,
      content: { sections: page.sections },
    }))
  )
  if (homePageError) {
    console.error('Create website starter pages error:', homePageError)
    await supabase.from('websites').delete().eq('id', website.id).eq('studio_id', membership.studioId)
    throw new Error('Failed to create the starter pages. Please try again.')
  }

  revalidatePath(`/dashboard/${studioSlug}/website`)
  redirect(`/dashboard/${studioSlug}/website/${website.id}/editor`)
}

export async function deleteWebsite(websiteId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('website:delete')
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { data: website } = await supabase
    .from('websites')
    .select('subdomain')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .maybeSingle()

  if (!website) return { error: 'Website not found' }

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
  revalidatePath(`/portfolio/${website.subdomain}`)
}

export async function bulkDeleteWebsites(websiteIds: string[], studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('website:delete')
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
  const membership = await requireStudioPermission('website:publish')
  if ('error' in membership) return membership

  if (status === 'published' && !(await hasEntitlement(membership.studioId, 'website_builder'))) {
    return { error: 'Publishing a website requires an upgraded plan.' }
  }

  const supabase = await createClient()
  const { data: website } = await supabase
    .from('websites')
    .select('subdomain')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .maybeSingle()

  if (!website) return { error: 'Website not found' }

  if (status === 'published') {
    const { data: homePage } = await supabase
      .from('website_pages')
      .select('id')
      .eq('website_id', websiteId)
      .eq('path', '/')
      .eq('is_published', true)
      .maybeSingle()
    if (!homePage) return { error: 'Publish the Home page before publishing this website.' }
  }

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
  revalidatePath(`/portfolio/${website.subdomain}`)
}

export async function bulkSetWebsiteStatus(
  websiteIds: string[],
  status: WebsiteStatus,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('website:publish')
  if ('error' in membership) return membership

  if (status === 'published' && !(await hasEntitlement(membership.studioId, 'website_builder'))) {
    return { error: 'Publishing a website requires an upgraded plan.' }
  }

  const supabase = await createClient()
  if (status === 'published') {
    const { data: websites } = await supabase
      .from('websites')
      .select('id')
      .eq('studio_id', membership.studioId)
      .in('id', websiteIds)
    const selectedIds = [...new Set((websites ?? []).map((website) => website.id))]
    const { data: homePages } = selectedIds.length > 0
      ? await supabase
        .from('website_pages')
        .select('website_id')
        .in('website_id', selectedIds)
        .eq('path', '/')
        .eq('is_published', true)
      : { data: [] }
    const readyIds = new Set((homePages ?? []).map((page) => page.website_id))
    if (selectedIds.some((id) => !readyIds.has(id))) {
      return { error: 'Publish the Home page on every selected website before publishing them.' }
    }
  }

  const { data: websites } = await supabase
    .from('websites')
    .select('subdomain')
    .eq('studio_id', membership.studioId)
    .in('id', websiteIds)

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
  for (const website of websites ?? []) revalidatePath(`/portfolio/${website.subdomain}`)
}

export async function duplicateWebsite(websiteId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('website:create')
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
  template: z.enum(TEMPLATE_IDS),
  primary_color: z.string().max(20).optional(),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(500).optional(),
  password_protected: z.boolean(),
})

export async function updateWebsiteSettings(formData: FormData) {
  const membership = await requireStudioPermission('website:update')
  if ('error' in membership) throw new Error(membership.error)

  const websiteId = formData.get('id') as string
  const studioSlug = formData.get('studio_slug') as string

  const validated = updateWebsiteSchema.parse({
    name: formData.get('name'),
    custom_domain: formData.get('custom_domain') || undefined,
    template: formData.get('template') || 'modern-minimal',
    primary_color: formData.get('primary_color') || undefined,
    seo_title: formData.get('seo_title') || undefined,
    seo_description: formData.get('seo_description') || undefined,
    password_protected: formData.get('password_protected') === 'true',
  })

  if (validated.custom_domain && !(await hasEntitlement(membership.studioId, 'custom_domain'))) {
    throw new Error('Custom domains require an upgraded plan.')
  }

  const supabase = await createClient()
  const { data: current } = await supabase
    .from('websites')
    .select('theme, seo, subdomain')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!current) throw new Error('Website not found')

  const currentTheme = (current.theme ?? {}) as Record<string, unknown>
  const currentSeo = (current.seo ?? {}) as Record<string, unknown>
  const { error } = await supabase
    .from('websites')
    .update({
      name: validated.name,
      custom_domain: validated.custom_domain || null,
      template: validated.template,
      template_name: getTemplate(validated.template).label,
      theme: { ...currentTheme, primaryColor: validated.primary_color || undefined },
      seo: { ...currentSeo, title: validated.seo_title, description: validated.seo_description },
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
  revalidatePath(`/portfolio/${current.subdomain}`)
}

const addPageSchema = z.object({
  name: z.string().min(1, 'Page name is required').max(100),
  path: z
    .string()
    .min(1, 'Path is required')
    .regex(/^\/[a-z0-9-/]*$/, 'Path must start with / and use lowercase letters, numbers, and hyphens')
    .refine((path) => path === '/' || (!path.endsWith('/') && !path.includes('//')), 'Use one clean path without a trailing slash.'),
})

export async function addWebsitePage(formData: FormData) {
  const membership = await requireStudioPermission('website:manage_pages')
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
    .select('id, subdomain')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!website) throw new Error('Website not found')

  const { count } = await supabase
    .from('website_pages')
    .select('id', { count: 'exact', head: true })
    .eq('website_id', websiteId)

  const { data: existingPage } = await supabase
    .from('website_pages')
    .select('id')
    .eq('website_id', websiteId)
    .eq('path', validated.path)
    .maybeSingle()

  if (existingPage) throw new Error('That page path already exists on this website.')

  const { data: page, error } = await supabase.from('website_pages').insert({
    website_id: websiteId,
    name: validated.name,
    path: validated.path,
    order: count || 0,
    content: { version: 1, sections: [{ id: 'intro', type: 'text', heading: validated.name, body: '' }] },
  }).select('*').single()

  if (error) {
    console.error('Add website page error:', error)
    throw new Error('Failed to add page')
  }

  revalidatePath(`/dashboard/${studioSlug}/website/${websiteId}/editor`)
  return page as WebsitePageRow
}

export async function setPagePublished(
  pageId: string,
  isPublished: boolean,
  websiteId: string,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('website:manage_pages')
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { data: website } = await supabase
    .from('websites')
    .select('id, subdomain, status')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!website) return { error: 'Website not found' }

  // The public site 404s at its root without a published Home page, and
  // setWebsiteStatus is the only other place that rule is enforced.
  if (!isPublished && website.status === 'published') {
    const { data: page, error: pageError } = await supabase
      .from('website_pages')
      .select('path')
      .eq('id', pageId)
      .eq('website_id', websiteId)
      .maybeSingle()
    // Fail closed: if the page cannot be read we cannot rule out that it is Home.
    if (pageError || !page) return { error: 'Failed to update page' }
    if (page.path === '/') return { error: 'Unpublish the website before hiding its Home page.' }
  }

  const { data: updatedPage, error } = await supabase
    .from('website_pages')
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq('id', pageId)
    .eq('website_id', websiteId)
    .select('path')
    .single()

  if (error || !updatedPage) {
    console.error('Set page published error:', error)
    return { error: 'Failed to update page' }
  }

  revalidatePath(`/dashboard/${studioSlug}/website/${websiteId}/editor`)
  revalidatePath(`/portfolio/${website.subdomain}${updatedPage.path === '/' ? '' : updatedPage.path}`)
}

export async function deleteWebsitePage(
  pageId: string,
  websiteId: string,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('website:manage_pages')
  if ('error' in membership) return membership

  const supabase = await createClient()
  const { data: website } = await supabase
    .from('websites')
    .select('id, subdomain, status')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!website) return { error: 'Website not found' }

  if (website.status === 'published') {
    const { data: page, error: pageError } = await supabase
      .from('website_pages')
      .select('path')
      .eq('id', pageId)
      .eq('website_id', websiteId)
      .maybeSingle()
    if (pageError || !page) return { error: 'Failed to delete page' }
    if (page.path === '/') return { error: 'Unpublish the website before deleting its Home page.' }
  }

  const { data: deletedPage, error } = await supabase
    .from('website_pages')
    .delete()
    .eq('id', pageId)
    .eq('website_id', websiteId)
    .select('path')
    .single()

  if (error || !deletedPage) {
    console.error('Delete website page error:', error)
    return { error: 'Failed to delete page' }
  }

  revalidatePath(`/dashboard/${studioSlug}/website/${websiteId}/editor`)
  revalidatePath(`/portfolio/${website.subdomain}${deletedPage.path === '/' ? '' : deletedPage.path}`)
}

export async function updateWebsitePageContent(formData: FormData): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('website:manage_pages')
  if ('error' in membership) return membership

  const pageId = formData.get('page_id') as string
  const websiteId = formData.get('website_id') as string
  const studioSlug = formData.get('studio_slug') as string

  let rawSections: unknown
  try {
    rawSections = JSON.parse(String(formData.get('sections') ?? '[]'))
  } catch {
    return { error: 'The page sections could not be read. Please reload and try again.' }
  }
  const parsedSections = websiteSectionsSchema.safeParse(rawSections)
  if (!parsedSections.success) return { error: 'Some section content is invalid. Review the fields and try again.' }

  const supabase = await createClient()
  const { data: website } = await supabase
    .from('websites')
    .select('id, subdomain')
    .eq('id', websiteId)
    .eq('studio_id', membership.studioId)
    .single()

  if (!website) return { error: 'Website not found' }

  const { data: updatedPage, error } = await supabase
    .from('website_pages')
    .update({
      content: { version: 1, sections: parsedSections.data },
      updated_at: new Date().toISOString(),
    })
    .eq('id', pageId)
    .eq('website_id', websiteId)
    .select('path')
    .single()

  if (error || !updatedPage) {
    console.error('Update website page content error:', error)
    return { error: 'Failed to save page content' }
  }

  revalidatePath(`/dashboard/${studioSlug}/website/${websiteId}/editor`)
  revalidatePath(`/dashboard/${studioSlug}/website/${websiteId}/preview`)
  revalidatePath(`/portfolio/${website.subdomain}${updatedPage.path === '/' ? '' : updatedPage.path}`)
}


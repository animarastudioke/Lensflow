'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createStudioSchema = z.object({
  name: z.string().min(2, 'Studio name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2, 'URL must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
})

export async function createStudio(formData: FormData): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const parsed = createStudioSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const validated = parsed.data

  const { data: existing } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', validated.slug)
    .maybeSingle()

  if (existing) {
    return { error: 'That studio URL is already taken' }
  }

  const { data: studio, error: studioError } = await supabase
    .from('studios')
    .insert({
      name: validated.name,
      slug: validated.slug,
      owner_id: user.id,
    })
    .select('id, slug')
    .single()

  if (studioError || !studio) {
    return { error: 'Failed to create studio' }
  }

  const { error: memberError } = await supabase
    .from('studio_members')
    .insert({
      studio_id: studio.id,
      user_id: user.id,
      role: 'studio_owner',
      status: 'active',
      joined_at: new Date().toISOString(),
    })

  if (memberError) {
    return { error: 'Failed to set up studio membership' }
  }

  await supabase
    .from('profiles')
    .update({ studio_id: studio.id, role: 'studio_owner' })
    .eq('id', user.id)

  redirect(`/dashboard/${studio.slug}`)
}

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  if (!/^[a-z0-9-]{2,50}$/.test(slug)) return false

  const supabase = await createClient()
  const { data } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  return !data
}

export async function getStudioForSettings(studioSlug: string): Promise<{ id: string; name: string; ownerId: string } | null> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id, name, owner_id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  return { id: studio.id, name: studio.name, ownerId: studio.owner_id }
}

export interface StudioSettingsRow {
  name: string
  description: string | null
  website_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  legal_business_name: string | null
  tax_id: string | null
  business_type: string | null
  currency: string
  payment_terms: string
}

export async function getStudioSettings(studioSlug: string): Promise<StudioSettingsRow | null> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('name, description, website_url, phone, email, address, legal_business_name, tax_id, business_type, currency, payment_terms')
    .eq('slug', studioSlug)
    .single()

  return studio
}

export async function getStudioCurrency(studioSlug: string): Promise<string> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('currency')
    .eq('slug', studioSlug)
    .single()

  return studio?.currency ?? 'USD'
}

const studioSettingsSchema = z.object({
  name: z.string().min(2, 'Studio name must be at least 2 characters').max(100),
  description: z.string().max(2000).optional(),
  website_url: z.string().url('Enter a valid URL').max(300).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  email: z.string().email('Enter a valid email').max(200).optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  legal_business_name: z.string().max(200).optional(),
  tax_id: z.string().max(50).optional(),
  business_type: z.enum(['sole', 'llc', 'corp', 'partnership', 'nonprofit']).optional(),
  currency: z.string().length(3).default('USD'),
  payment_terms: z.enum(['due_on_receipt', 'net7', 'net15', 'net30', 'net45', 'net60']).default('net30'),
})

export async function updateStudioSettings(studioSlug: string, formData: FormData): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    return { error: 'No active studio membership' }
  }

  const parsed = studioSettingsSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    website_url: formData.get('website_url') || '',
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || '',
    address: formData.get('address') || undefined,
    legal_business_name: formData.get('legal_business_name') || undefined,
    tax_id: formData.get('tax_id') || undefined,
    business_type: formData.get('business_type') || undefined,
    currency: formData.get('currency') || 'USD',
    payment_terms: formData.get('payment_terms') || 'net30',
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const validated = parsed.data

  const { error } = await supabase
    .from('studios')
    .update({
      name: validated.name,
      description: validated.description,
      website_url: validated.website_url || null,
      phone: validated.phone,
      email: validated.email || null,
      address: validated.address,
      legal_business_name: validated.legal_business_name,
      tax_id: validated.tax_id,
      business_type: validated.business_type,
      currency: validated.currency,
      payment_terms: validated.payment_terms,
      updated_at: new Date().toISOString(),
    })
    .eq('id', membership.studio_id)

  if (error) {
    console.error('Update studio settings error:', error)
    return { error: 'Failed to save settings' }
  }

  revalidatePath(`/dashboard/${studioSlug}`, 'layout')
}

async function deleteStudioStorageObjects(studioId: string) {
  const supabase = await createClient()
  const bucket = supabase.storage.from('gallery-media')

  const { data: galleryFolders } = await bucket.list(studioId, { limit: 1000 })
  if (!galleryFolders) return

  const pathsToRemove: string[] = []

  for (const folder of galleryFolders) {
    const galleryPath = `${studioId}/${folder.name}`

    const { data: galleryFiles } = await bucket.list(galleryPath, { limit: 1000 })
    for (const item of galleryFiles ?? []) {
      if (item.id) {
        pathsToRemove.push(`${galleryPath}/${item.name}`)
      }
    }

    const { data: thumbFiles } = await bucket.list(`${galleryPath}/thumbs`, { limit: 1000 })
    for (const item of thumbFiles ?? []) {
      pathsToRemove.push(`${galleryPath}/thumbs/${item.name}`)
    }
  }

  if (pathsToRemove.length > 0) {
    await bucket.remove(pathsToRemove)
  }
}

export async function deleteStudio(
  studioSlug: string,
  confirmName: string
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: studio } = await supabase
    .from('studios')
    .select('id, name, owner_id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) {
    return { error: 'Studio not found' }
  }

  if (studio.owner_id !== user.id) {
    return { error: 'Only the studio owner can delete this studio' }
  }

  if (confirmName.trim() !== studio.name.trim()) {
    return { error: 'Studio name does not match' }
  }

  await deleteStudioStorageObjects(studio.id)

  const { error: deleteError } = await supabase
    .from('studios')
    .delete()
    .eq('id', studio.id)

  if (deleteError) {
    console.error('Delete studio error:', deleteError)
    return { error: 'Failed to delete studio' }
  }

  redirect('/dashboard/new')
}

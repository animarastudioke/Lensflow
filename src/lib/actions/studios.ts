'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { deleteObjectsByPrefix, deleteObject, uploadObject, getR2PublicUrl, keyFromR2PublicUrl } from '@/lib/storage/r2'
import { getFreePlan, getEffectivePlan } from '@/lib/entitlements'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { recordFreeWorkspaceSignupRisk } from '@/lib/actions/signup-risk'

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

  // Anti-abuse: a new studio always starts on the Free plan, so the only
  // thing standing between "sign up once" and "create unlimited free
  // studios from one account" is this check. A user can always create their
  // first studio; creating another is blocked while they still own an
  // active Free-plan studio (upgrading that studio clears the block).
  const { data: ownedStudios } = await supabaseAdmin
    .from('studios')
    .select('id')
    .eq('owner_id', user.id)

  if (ownedStudios && ownedStudios.length > 0) {
    const plans = await Promise.all(ownedStudios.map((s) => getEffectivePlan(s.id)))
    if (plans.some((plan) => plan.slug === 'free')) {
      return { error: 'You already have a studio on the Free plan. Upgrade it before creating another studio.' }
    }
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

  // Every studio needs a subscription row so entitlement resolution has
  // something to find. This uses the service-role client because studio
  // members have no client-side write policy on subscriptions (all
  // subscription mutations go through trusted server code). Non-fatal if it
  // fails — getEffectivePlan() falls back to Free when no row exists anyway.
  try {
    const freePlan = await getFreePlan()
    await supabaseAdmin.from('subscriptions').insert({
      studio_id: studio.id,
      plan_id: freePlan.id,
      status: 'active',
    })
  } catch (subscriptionError) {
    console.error('Failed to create default subscription:', subscriptionError)
  }

  // Best-effort, score-based abuse signal - see recordFreeWorkspaceSignupRisk
  // for why this never blocks studio creation on its own.
  try {
    await recordFreeWorkspaceSignupRisk({
      userId: user.id,
      studioId: studio.id,
      userCreatedAt: user.created_at,
    })
  } catch (riskError) {
    console.error('Failed to record signup risk signal:', riskError)
  }

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

export async function getStudioForSettings(studioSlug: string): Promise<{ id: string; name: string; ownerId: string; logoUrl: string | null } | null> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id, name, owner_id, logo_url')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  return { id: studio.id, name: studio.name, ownerId: studio.owner_id, logoUrl: studio.logo_url }
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
  logo_url: string | null
  brand_color: string | null
}

export async function getStudioSettings(studioSlug: string): Promise<StudioSettingsRow | null> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('name, description, website_url, phone, email, address, legal_business_name, tax_id, business_type, currency, payment_terms, logo_url, brand_color')
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

const brandColorSchema = z.object({
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Enter a valid hex color, e.g. #3B82F6'),
})

export async function updateStudioBranding(studioSlug: string, formData: FormData): Promise<{ error: string } | undefined> {
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

  const parsed = brandColorSchema.safeParse({ brand_color: formData.get('brand_color') })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { error } = await supabase
    .from('studios')
    .update({ brand_color: parsed.data.brand_color, updated_at: new Date().toISOString() })
    .eq('id', membership.studio_id)

  if (error) {
    console.error('Update studio branding error:', error)
    return { error: 'Failed to save brand color' }
  }

  revalidatePath(`/dashboard/${studioSlug}/settings`)
  revalidatePath(`/dashboard/${studioSlug}`, 'layout')
}

const LOGO_MAX_BYTES = 5 * 1024 * 1024
const LOGO_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

export async function uploadStudioLogo(
  studioSlug: string,
  formData: FormData
): Promise<{ error: string } | { success: true; logoUrl: string }> {
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

  const file = formData.get('logo')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No file provided' }
  }

  const extension = LOGO_MIME_EXTENSIONS[file.type]
  if (!extension) {
    return { error: 'Logo must be a PNG, JPEG, WebP, or SVG image' }
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { error: 'Logo must be under 5MB' }
  }

  const { data: existingStudio } = await supabase
    .from('studios')
    .select('logo_url')
    .eq('id', membership.studio_id)
    .single()

  // The key includes a random suffix rather than a fixed "logo" filename so
  // a re-upload doesn't collide with a stale cached copy of the old one at
  // the same URL — the old object is deleted below once the new one is live.
  const key = `studios/${membership.studio_id}/branding/logo-${crypto.randomUUID()}.${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await uploadObject(key, buffer, file.type)
  } catch (err) {
    console.error('Logo upload error:', err)
    return { error: 'Failed to upload logo. Try again.' }
  }

  const logoUrl = getR2PublicUrl(key)

  const { error } = await supabase
    .from('studios')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('id', membership.studio_id)

  if (error) {
    console.error('Save logo_url error:', error)
    await deleteObject(key).catch(() => {})
    return { error: 'Failed to save logo' }
  }

  const oldKey = existingStudio?.logo_url ? keyFromR2PublicUrl(existingStudio.logo_url) : null
  if (oldKey) {
    await deleteObject(oldKey).catch((cleanupError) => {
      console.error('Failed to delete previous logo from R2:', cleanupError)
    })
  }

  revalidatePath(`/dashboard/${studioSlug}/settings`)
  revalidatePath(`/dashboard/${studioSlug}`, 'layout')
  return { success: true, logoUrl }
}

async function deleteStudioStorageObjects(studioId: string) {
  // R2 has no real folder hierarchy — deleting everything under the
  // studio's key prefix removes every gallery's previews, thumbnails, and
  // retained originals in one pass, no per-gallery listing required.
  await deleteObjectsByPrefix(`studios/${studioId}/`)
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

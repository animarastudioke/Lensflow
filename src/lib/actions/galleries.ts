'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import sharp from 'sharp'
import { canAcceptUpload, canCreateGallery, getEffectivePlan, hasEntitlement } from '@/lib/entitlements'
import {
  buildMediaKey,
  createPresignedUploadUrl,
  deleteObject,
  downloadObject,
  getR2PublicUrl,
  uploadObject,
} from '@/lib/storage/r2'

// Types
export type GalleryType = 'wedding' | 'portrait' | 'commercial' | 'event' | 'other'
export type GalleryStatus = 'draft' | 'published' | 'archived' | 'private'
export type GalleryLayoutType = 'grid' | 'masonry' | 'justified'
export type GalleryCoverTemplate = 'novel' | 'vintage' | 'frame' | 'stripe' | 'divider' | 'journal' | 'stamp' | 'outline'

export interface Gallery {
  id: string
  studio_id: string
  name: string
  description?: string
  type: GalleryType
  shoot_date?: string
  client_id?: string
  status: GalleryStatus
  password_protected: boolean
  password_hash?: string
  allow_download: boolean
  allow_comments: boolean
  allow_favorites: boolean
  watermark_enabled: boolean
  expiry_days?: number
  seo_title?: string
  seo_description?: string
  custom_domain?: string
  share_token: string
  cover_image?: string
  media_count: number
  view_count: number
  download_count: number
  layout_type: GalleryLayoutType
  cover_template: GalleryCoverTemplate
  created_at: string
  updated_at: string
}

export interface GalleryMediaRow {
  id: string
  filename: string
  url: string
  thumbnail_url: string | null
  type: 'image' | 'video'
  size: number | null
  width: number | null
  height: number | null
  is_favorite: boolean
  album_id: string | null
  created_at: string
}

export interface GalleryAlbumRow {
  id: string
  name: string
  description: string | null
  cover_image: string | null
  media_count: number
  order: number
  created_at: string
}

export interface GalleryShareSettingsRow {
  password_protected: boolean
  allow_download: boolean
  allow_comments: boolean
  allow_favorites: boolean
  require_email: boolean
  custom_branding: boolean
  brand_name: string | null
  brand_color: string | null
  brand_logo: string | null
  cover_image: string | null
}

export interface GalleryStudioRow {
  name: string
  logo_url: string | null
  brand_color: string | null
}

export interface GalleryDetailRow extends Gallery {
  client: { id: string; name: string; email: string } | null
  share_settings: GalleryShareSettingsRow | GalleryShareSettingsRow[] | null
  studio: GalleryStudioRow | null
  albums: GalleryAlbumRow[]
  media: GalleryMediaRow[]
}

export interface ShareSettings {
  link_name?: string
  password_protected: boolean
  password_hash?: string
  expires_at?: string
  allow_download: boolean
  allow_comments: boolean
  allow_favorites: boolean
  require_email: boolean
  collect_email: boolean
  custom_branding: boolean
  brand_name?: string
  brand_logo?: string
  brand_color?: string
  cover_image?: string
  notify_on_view: boolean
  notify_on_download: boolean
  notify_on_favorite: boolean
  notify_on_comment: boolean
  allow_embed: boolean
  embed_width: number
  embed_height: number
}

// Validation schemas
const galleryBaseSchema = z.object({
  name: z.string().min(1, 'Gallery name is required').max(100),
  description: z.string().max(1000).optional(),
  type: z.enum(['wedding', 'portrait', 'commercial', 'event', 'other']),
  shoot_date: z.string().optional(),
  client_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'published', 'private']).default('draft'),
  password_protected: z.boolean().default(false),
  password: z.string().optional(),
  allow_download: z.boolean().default(true),
  allow_comments: z.boolean().default(true),
  allow_favorites: z.boolean().default(true),
  watermark_enabled: z.boolean().default(false),
  expiry_days: z.number().min(1).max(365).optional(),
  seo_title: z.string().max(60).optional(),
  seo_description: z.string().max(160).optional(),
  custom_domain: z.string().optional(),
})

const galleryCreateSchema = galleryBaseSchema.refine(data => !data.password_protected || data.password, {
  message: 'Password is required when password protection is enabled',
  path: ['password'],
})

const galleryUpdateSchema = galleryBaseSchema.partial().extend({
  id: z.string().uuid(),
})

const shareSettingsSchema = z.object({
  link_name: z.string().max(50).optional(),
  password_protected: z.boolean().default(false),
  password: z.string().optional(),
  expires_at: z.string().optional(),
  allow_download: z.boolean().default(true),
  allow_comments: z.boolean().default(true),
  allow_favorites: z.boolean().default(true),
  require_email: z.boolean().default(false),
  collect_email: z.boolean().default(false),
  custom_branding: z.boolean().default(false),
  brand_name: z.string().max(50).optional(),
  brand_logo: z.string().url().optional().or(z.literal('')),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  cover_image: z.string().url().optional().or(z.literal('')),
  notify_on_view: z.boolean().default(false),
  notify_on_download: z.boolean().default(true),
  notify_on_favorite: z.boolean().default(false),
  notify_on_comment: z.boolean().default(true),
  allow_embed: z.boolean().default(false),
  embed_width: z.number().min(300).max(1920).default(800),
  embed_height: z.number().min(200).max(1080).default(600),
}).refine(data => !data.password_protected || data.password, {
  message: 'Password is required when password protection is enabled',
  path: ['password'],
})

// Generate a secure share token
function generateShareToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Hash password using bcrypt (would use proper bcrypt in production)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password)
  return newHash === hash
}

// Server Actions

export async function createGallery(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const studioSlug = formData.get('studio_slug') as string

  // Get user's studio
  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    throw new Error('No active studio membership')
  }

  // Validate input
  const rawData = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    type: formData.get('type'),
    shoot_date: formData.get('shoot_date') || undefined,
    client_id: formData.get('client_id') || undefined,
    status: formData.get('status') || 'draft',
    password_protected: formData.get('password_protected') === 'true',
    password: formData.get('password') || undefined,
    allow_download: formData.get('allow_download') !== 'false',
    allow_comments: formData.get('allow_comments') !== 'false',
    allow_favorites: formData.get('allow_favorites') !== 'false',
    watermark_enabled: formData.get('watermark_enabled') === 'true',
    expiry_days: formData.get('expiry_days') ? Number(formData.get('expiry_days')) : undefined,
    seo_title: formData.get('seo_title') || undefined,
    seo_description: formData.get('seo_description') || undefined,
    custom_domain: formData.get('custom_domain') || undefined,
  }

  const validated = galleryCreateSchema.parse(rawData)

  // Check permission
  const hasPermission = await checkGalleryPermission(membership.studio_id, user.id, 'galleries.create')
  if (!hasPermission) {
    throw new Error('Insufficient permissions to create gallery')
  }

  // Free-tier (and any future plan with a gallery cap) enforcement — checked
  // server-side, not just hidden in the UI.
  const galleryQuota = await canCreateGallery(membership.studio_id)
  if (!galleryQuota.allowed) {
    throw new Error(galleryQuota.reason)
  }

  if (validated.custom_domain && !(await hasEntitlement(membership.studio_id, 'custom_domain'))) {
    throw new Error('Custom domains require an upgraded plan.')
  }

  // Hash password if provided
  let passwordHash: string | undefined
  if (validated.password_protected && validated.password) {
    passwordHash = await hashPassword(validated.password)
  }

  // Create gallery
  const shareToken = generateShareToken()
  const { data: gallery, error } = await supabase
    .from('galleries')
    .insert({
      studio_id: membership.studio_id,
      created_by: user.id,
      name: validated.name,
      description: validated.description,
      type: validated.type,
      shoot_date: validated.shoot_date,
      client_id: validated.client_id,
      status: validated.status,
      password_protected: validated.password_protected,
      password_hash: passwordHash,
      allow_download: validated.allow_download,
      allow_comments: validated.allow_comments,
      allow_favorites: validated.allow_favorites,
      watermark_enabled: validated.watermark_enabled,
      expiry_days: validated.expiry_days,
      seo_title: validated.seo_title,
      seo_description: validated.seo_description,
      custom_domain: validated.custom_domain,
      share_token: shareToken,
      media_count: 0,
      view_count: 0,
      download_count: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Create gallery error:', error)
    throw new Error('Failed to create gallery')
  }

  // Create default share settings
  await supabase
    .from('gallery_share_settings')
    .insert({
      gallery_id: gallery.id,
      link_name: validated.name,
      password_protected: validated.password_protected,
      password_hash: passwordHash,
      allow_download: validated.allow_download,
      allow_comments: validated.allow_comments,
      allow_favorites: validated.allow_favorites,
    })

  revalidatePath(`/dashboard/${studioSlug}/galleries`)
  redirect(`/dashboard/${studioSlug}/galleries/${gallery.id}`)
}

export async function updateGallery(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const id = formData.get('id') as string
  const studioSlug = formData.get('studio_slug') as string

  // Get studio by slug
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) {
    throw new Error('Studio not found')
  }

  // Check permission
  const hasPermission = await checkGalleryPermission(studio.id, user.id, 'galleries.edit')
  if (!hasPermission) {
    throw new Error('Insufficient permissions to edit gallery')
  }

  // Get existing gallery
  const { data: existing } = await supabase
    .from('galleries')
    .select('*')
    .eq('id', id)
    .eq('studio_id', studio.id)
    .single()

  if (!existing) {
    throw new Error('Gallery not found')
  }

  const rawData = {
    id,
    name: (formData.get('name') as string) || existing.name,
    description: (formData.get('description') as string) || existing.description || undefined,
    type: (formData.get('type') as GalleryType) || existing.type,
    shoot_date: (formData.get('shoot_date') as string) || existing.shoot_date || undefined,
    client_id: (formData.get('client_id') as string) || existing.client_id || undefined,
    status: (formData.get('status') as GalleryStatus) || existing.status,
    password_protected: formData.get('password_protected') === 'true',
    password: (formData.get('password') as string) || undefined,
    allow_download: formData.get('allow_download') !== 'false',
    allow_comments: formData.get('allow_comments') !== 'false',
    allow_favorites: formData.get('allow_favorites') !== 'false',
    watermark_enabled: formData.get('watermark_enabled') === 'true',
    expiry_days: formData.get('expiry_days') ? Number(formData.get('expiry_days')) : (existing.expiry_days ?? undefined),
    seo_title: (formData.get('seo_title') as string) || existing.seo_title || undefined,
    seo_description: (formData.get('seo_description') as string) || existing.seo_description || undefined,
    custom_domain: (formData.get('custom_domain') as string) || existing.custom_domain || undefined,
  }

  const validated = galleryUpdateSchema.parse(rawData)

  // Hash password if provided and changed
  let passwordHash = existing.password_hash
  if (validated.password_protected && validated.password && validated.password !== existing.password_hash) {
    passwordHash = await hashPassword(validated.password)
  } else if (!validated.password_protected) {
    passwordHash = null
  }

  const { error } = await supabase
    .from('galleries')
    .update({
      name: validated.name,
      description: validated.description,
      type: validated.type,
      shoot_date: validated.shoot_date,
      client_id: validated.client_id,
      status: validated.status,
      password_protected: validated.password_protected,
      password_hash: passwordHash,
      allow_download: validated.allow_download,
      allow_comments: validated.allow_comments,
      allow_favorites: validated.allow_favorites,
      watermark_enabled: validated.watermark_enabled,
      expiry_days: validated.expiry_days,
      seo_title: validated.seo_title,
      seo_description: validated.seo_description,
      custom_domain: validated.custom_domain,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('studio_id', studio.id)

  if (error) {
    console.error('Update gallery error:', error)
    throw new Error('Failed to update gallery')
  }

  // Update share settings
  await supabase
    .from('gallery_share_settings')
    .upsert({
      gallery_id: id,
      ...validated,
    })

  revalidatePath(`/dashboard/${studioSlug}/galleries/${id}`)
  revalidatePath(`/dashboard/${studioSlug}/galleries`)
  redirect(`/dashboard/${studioSlug}/galleries/${id}`)
}

export async function deleteGallery(galleryId: string, studioSlug: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) {
    throw new Error('Studio not found')
  }

  const hasPermission = await checkGalleryPermission(studio.id, user.id, 'galleries.delete')
  if (!hasPermission) {
    throw new Error('Insufficient permissions to delete gallery')
  }

  // Soft delete - update status to archived
  const { error } = await supabase
    .from('galleries')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', galleryId)
    .eq('studio_id', studio.id)

  if (error) {
    throw new Error('Failed to delete gallery')
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries`)
  return { success: true }
}

export async function getGallery(galleryId: string, studioSlug: string): Promise<GalleryDetailRow | null> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  const { data: gallery } = await supabase
    .from('galleries')
    .select(`
      *,
      client:clients(id, name, email),
      share_settings:gallery_share_settings(*),
      studio:studios(name, logo_url, brand_color),
      albums:gallery_albums(id, name, description, cover_image, media_count, order, created_at),
      media:media(id, filename, url, thumbnail_url, type, size, width, height, is_favorite, album_id, created_at)
    `)
    .eq('id', galleryId)
    .eq('studio_id', studio.id)
    .single()

  return (gallery as unknown as GalleryDetailRow) ?? null
}

export async function getGalleryByToken(shareToken: string) {
  const supabase = await createClient()

  const { data: gallery } = await supabase
    .from('galleries')
    .select(`
      *,
      studio:studios(id, name, slug, logo_url, brand_color),
      client:clients(id, name, email),
      share_settings:gallery_share_settings(*),
      albums:gallery_albums(id, name, description, cover_image, media_count, order, created_at),
      media:media(id, filename, url, thumbnail_url, type, size, width, height, metadata, is_favorite, comment_count, created_at, album_id)
    `)
    .eq('share_token', shareToken)
    .eq('status', 'published')
    .single()

  if (!gallery) return null

  // Check if expired
  if (gallery.expiry_days && gallery.created_at) {
    const created = new Date(gallery.created_at)
    const expiry = new Date(created.getTime() + gallery.expiry_days * 24 * 60 * 60 * 1000)
    if (new Date() > expiry) {
      return { ...gallery, expired: true }
    }
  }

  // Resolved server-side so the client never decides for itself whether
  // downloads/branding are allowed — it only renders what this says.
  const plan = await getEffectivePlan(gallery.studio_id)
  const entitlements = {
    canDownloadOriginals: plan.canDownloadOriginals,
    canBulkDownload: plan.canBulkDownload,
    showPoweredByBadge: plan.showPoweredByBadge,
  }

  return { ...gallery, entitlements }
}

export async function verifyGalleryPassword(shareToken: string, password: string) {
  const supabase = await createClient()

  const { data: gallery } = await supabase
    .from('galleries')
    .select('password_hash, password_protected')
    .eq('share_token', shareToken)
    .single()

  if (!gallery || !gallery.password_protected) return true

  return await verifyPassword(password, gallery.password_hash)
}

export async function incrementGalleryView(shareToken: string) {
  const supabase = await createClient()

  await supabase.rpc('increment_gallery_view', { token: shareToken })
}

export async function incrementGalleryDownload(shareToken: string) {
  const supabase = await createClient()

  await supabase.rpc('increment_gallery_download', { token: shareToken })

  const { data: gallery } = await supabase
    .from('galleries')
    .select('studio_id, name, studio:studios(slug)')
    .eq('share_token', shareToken)
    .single()

  if (gallery) {
    const studioSlug = (gallery.studio as unknown as { slug: string } | null)?.slug
    const { createNotification } = await import('@/lib/actions/notifications')
    await createNotification(gallery.studio_id, {
      type: 'gallery_downloaded',
      title: 'Gallery downloaded',
      body: `A client downloaded a photo from "${gallery.name}"`,
      link: studioSlug ? `/dashboard/${studioSlug}/galleries` : undefined,
    })
  }
}

// Share Settings Actions
export async function getShareSettings(galleryId: string, studioSlug: string) {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  const { data: settings } = await supabase
    .from('gallery_share_settings')
    .select('*')
    .eq('gallery_id', galleryId)
    .single()

  return settings
}

export async function updateShareSettings(galleryId: string, studioSlug: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) {
    throw new Error('Studio not found')
  }

  const hasPermission = await checkGalleryPermission(studio.id, user.id, 'galleries.edit')
  if (!hasPermission) {
    throw new Error('Insufficient permissions')
  }

  const rawData = {
    link_name: formData.get('link_name') as string,
    password_protected: formData.get('password_protected') === 'true',
    password: formData.get('password') === '' ? undefined : (formData.get('password') as string),
    expires_at: formData.get('expires_at') as string,
    allow_download: formData.get('allow_download') !== 'false',
    allow_comments: formData.get('allow_comments') !== 'false',
    allow_favorites: formData.get('allow_favorites') !== 'false',
    require_email: formData.get('require_email') === 'true',
    collect_email: formData.get('collect_email') === 'true',
    custom_branding: formData.get('custom_branding') === 'true',
    brand_name: formData.get('brand_name') as string,
    brand_logo: formData.get('brand_logo') as string,
    brand_color: formData.get('brand_color') as string,
    cover_image: formData.get('cover_image') as string,
    notify_on_view: formData.get('notify_on_view') === 'true',
    notify_on_download: formData.get('notify_on_download') !== 'false',
    notify_on_favorite: formData.get('notify_on_favorite') === 'true',
    notify_on_comment: formData.get('notify_on_comment') !== 'false',
    allow_embed: formData.get('allow_embed') === 'true',
    embed_width: formData.get('embed_width') ? Number(formData.get('embed_width')) : 800,
    embed_height: formData.get('embed_height') ? Number(formData.get('embed_height')) : 600,
  }

  const validated = shareSettingsSchema.parse(rawData)

  // Hash password if needed
  let passwordHash: string | null = null
  if (validated.password_protected && validated.password) {
    passwordHash = await hashPassword(validated.password)
  }

  // Update gallery table with access settings
  await supabase
    .from('galleries')
    .update({
      password_protected: validated.password_protected,
      password_hash: passwordHash,
      allow_download: validated.allow_download,
      allow_comments: validated.allow_comments,
      allow_favorites: validated.allow_favorites,
      updated_at: new Date().toISOString(),
    })
    .eq('id', galleryId)
    .eq('studio_id', studio.id)

  // Update share settings
  const { error } = await supabase
    .from('gallery_share_settings')
    .upsert({
      gallery_id: galleryId,
      link_name: validated.link_name,
      password_protected: validated.password_protected,
      password_hash: passwordHash,
      expires_at: validated.expires_at || null,
      allow_download: validated.allow_download,
      allow_comments: validated.allow_comments,
      allow_favorites: validated.allow_favorites,
      require_email: validated.require_email,
      collect_email: validated.collect_email,
      custom_branding: validated.custom_branding,
      brand_name: validated.brand_name,
      brand_logo: validated.brand_logo,
      brand_color: validated.brand_color,
      cover_image: validated.cover_image,
      notify_on_view: validated.notify_on_view,
      notify_on_download: validated.notify_on_download,
      notify_on_favorite: validated.notify_on_favorite,
      notify_on_comment: validated.notify_on_comment,
      allow_embed: validated.allow_embed,
      embed_width: validated.embed_width,
      embed_height: validated.embed_height,
    })

  if (error) {
    throw new Error('Failed to update share settings')
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}/share`)
  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  return { success: true }
}

export async function regenerateShareToken(galleryId: string, studioSlug: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) throw new Error('Studio not found')

  const hasPermission = await checkGalleryPermission(studio.id, user.id, 'galleries.edit')
  if (!hasPermission) throw new Error('Insufficient permissions')

  const newToken = generateShareToken()

  const { error } = await supabase
    .from('galleries')
    .update({ share_token: newToken, updated_at: new Date().toISOString() })
    .eq('id', galleryId)
    .eq('studio_id', studio.id)

  if (error) throw new Error('Failed to regenerate token')

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  return { success: true, newToken }
}

// Helper function to check permissions
async function checkGalleryPermission(studioId: string, userId: string, permission: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from('studio_members')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (!membership) return false

  // Check role permissions hierarchy
  const rolePermissions: Record<string, string[]> = {
    super_admin: ['*'],
    studio_owner: ['galleries.*', 'galleries.create', 'galleries.read', 'galleries.edit', 'galleries.delete'],
    photographer: ['galleries.create', 'galleries.read', 'galleries.edit'],
    team_member: ['galleries.read', 'galleries.edit'],
    editor: ['galleries.read'],
    client: [],
  }

  const permissions = rolePermissions[membership.role] || []
  return permissions.includes('*') || permissions.includes(permission) || permissions.includes(permission.split('.')[0] + '.*')
}

// Gallery List
export async function getGalleries(studioSlug: string, options?: {
  page?: number
  limit?: number
  search?: string
  status?: GalleryStatus
  type?: GalleryType
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return { galleries: [], total: 0 }

  const page = options?.page || 1
  const limit = options?.limit || 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('galleries')
    .select('*, client:clients(name)', { count: 'exact' })
    .eq('studio_id', studio.id)
    .neq('status', 'archived')

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`)
  }
  if (options?.status) {
    query = query.eq('status', options.status)
  }
  if (options?.type) {
    query = query.eq('type', options.type)
  }

  const sortBy = options?.sortBy || 'created_at'
  const sortOrder = options?.sortOrder || 'desc'
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })
  query = query.range(from, to)

  const { data: galleries, count, error } = await query

  if (error) {
    console.error('Get galleries error:', error)
    return { galleries: [], total: 0 }
  }

  return { galleries: galleries || [], total: count || 0 }
}

// Media upload

const MAX_UPLOAD_DIMENSION = 2400
const THUMBNAIL_WIDTH = 600

const EXTENSION_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  tiff: 'image/tiff',
  tif: 'image/tiff',
}

function guessImageMimeType(extension: string): string {
  return EXTENSION_MIME_TYPES[extension.toLowerCase()] ?? 'application/octet-stream'
}

function fileExtension(filename: string): string {
  return (filename.match(/\.[^/.]+$/)?.[0] ?? '.jpg').replace('.', '').toLowerCase()
}

// Photos are uploaded directly from the browser to Cloudflare R2 (bypassing this
// server action) because Vercel Serverless Functions hard-cap request bodies at 4.5MB,
// well under the size of real photos. The browser instead PUTs the file straight to a
// short-lived presigned R2 URL obtained from requestGalleryUploadUrl below, then this
// action does the sharp processing server-side by downloading the raw upload from R2 —
// which is not subject to that inbound request-body limit.

/**
 * Issues a presigned R2 upload URL for a single file. This is the server-side
 * storage-quota enforcement point: the check happens here, before any upload
 * URL is handed out, never only in the browser.
 */
export async function requestGalleryUploadUrl(
  galleryId: string,
  filename: string,
  contentType: string,
  sizeBytes: number
): Promise<{ uploadUrl: string; key: string; mediaId: string } | { error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    return { error: 'No active studio membership' }
  }

  const hasPermission = await checkGalleryPermission(membership.studio_id, user.id, 'galleries.edit')
  if (!hasPermission) {
    return { error: 'Insufficient permissions to upload media' }
  }

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id')
    .eq('id', galleryId)
    .eq('studio_id', membership.studio_id)
    .single()

  if (!gallery) {
    return { error: 'Gallery not found' }
  }

  if (!contentType.startsWith('image/')) {
    return { error: 'Only image uploads are supported' }
  }

  const quota = await canAcceptUpload(membership.studio_id, sizeBytes)
  if (!quota.allowed) {
    return { error: quota.reason }
  }

  const mediaId = crypto.randomUUID()
  const key = buildMediaKey({
    studioId: membership.studio_id,
    galleryId,
    mediaId,
    variant: 'raw',
    extension: fileExtension(filename),
  })

  const uploadUrl = await createPresignedUploadUrl(key, contentType)
  return { uploadUrl, key, mediaId }
}

export async function finalizeGalleryMediaUpload(
  galleryId: string,
  studioSlug: string,
  uploads: { mediaId: string; key: string; filename: string }[]
): Promise<{ success: true; uploaded: number } | { error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    return { error: 'No active studio membership' }
  }

  const hasPermission = await checkGalleryPermission(membership.studio_id, user.id, 'galleries.edit')
  if (!hasPermission) {
    return { error: 'Insufficient permissions to upload media' }
  }

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, cover_image, media_count')
    .eq('id', galleryId)
    .eq('studio_id', membership.studio_id)
    .single()

  if (!gallery) {
    return { error: 'Gallery not found' }
  }

  if (uploads.length === 0) {
    return { error: 'No files provided' }
  }

  const studioId = membership.studio_id
  const expectedPrefix = `studios/${studioId}/galleries/${galleryId}/assets/`
  // Originals are only retained in R2 for plans that can actually download them —
  // Free-tier uploads are processed exactly as before (preview + thumb only).
  const plan = await getEffectivePlan(studioId)

  const rows: {
    id: string
    gallery_id: string
    filename: string
    url: string
    thumbnail_url: string
    original_key: string | null
    type: 'image'
    size: number
    storage_bytes: number
    width: number
    height: number
  }[] = []

  for (const upload of uploads) {
    if (!upload.key.startsWith(expectedPrefix) || !upload.key.includes(`/assets/${upload.mediaId}/`)) continue

    let buffer: Buffer
    try {
      buffer = await downloadObject(upload.key)
    } catch (downloadError) {
      console.error('Gallery media download error:', downloadError)
      continue
    }

    const image = sharp(buffer)
    const metadata = await image.metadata()

    const previewBuffer = await image
      .resize({ width: MAX_UPLOAD_DIMENSION, height: MAX_UPLOAD_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer()

    const thumbBuffer = await sharp(buffer)
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()

    const previewKey = buildMediaKey({ studioId, galleryId, mediaId: upload.mediaId, variant: 'preview', extension: 'webp' })
    const thumbKey = buildMediaKey({ studioId, galleryId, mediaId: upload.mediaId, variant: 'thumb', extension: 'webp' })

    try {
      await uploadObject(previewKey, previewBuffer, 'image/webp')
      await uploadObject(thumbKey, thumbBuffer, 'image/webp')
    } catch (uploadError) {
      console.error('Gallery media upload error:', uploadError)
      continue
    }

    let originalKey: string | null = null
    let originalBytes = 0
    if (plan.canDownloadOriginals) {
      const extension = fileExtension(upload.filename)
      const candidateKey = buildMediaKey({ studioId, galleryId, mediaId: upload.mediaId, variant: 'original', extension })
      try {
        await uploadObject(candidateKey, buffer, guessImageMimeType(extension))
        originalKey = candidateKey
        originalBytes = buffer.byteLength
      } catch (originalUploadError) {
        console.error('Gallery original upload error:', originalUploadError)
      }
    }

    await deleteObject(upload.key).catch((cleanupError) => {
      console.error('Failed to delete raw R2 upload:', cleanupError)
    })

    rows.push({
      id: upload.mediaId,
      gallery_id: galleryId,
      filename: upload.filename,
      url: getR2PublicUrl(previewKey),
      thumbnail_url: getR2PublicUrl(thumbKey),
      original_key: originalKey,
      type: 'image',
      size: previewBuffer.byteLength,
      storage_bytes: previewBuffer.byteLength + thumbBuffer.byteLength + originalBytes,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    })
  }

  if (rows.length === 0) {
    return { error: 'No valid image files were uploaded' }
  }

  const { error: insertError } = await supabase.from('media').insert(rows)

  if (insertError) {
    console.error('Insert media rows error:', insertError)
    return { error: 'Failed to save uploaded media' }
  }

  const firstUploadedUrl = rows[0]?.url

  await supabase
    .from('galleries')
    .update({
      media_count: gallery.media_count + rows.length,
      cover_image: gallery.cover_image ?? firstUploadedUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', galleryId)

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)

  return { success: true, uploaded: rows.length }
}

async function requireGalleryEditMembership() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    throw new Error('No active studio membership')
  }

  const hasPermission = await checkGalleryPermission(membership.studio_id, user.id, 'galleries.edit')
  if (!hasPermission) {
    throw new Error('Insufficient permissions to edit gallery')
  }

  return { supabase, studioId: membership.studio_id }
}

export async function updateGalleryLayout(
  galleryId: string,
  studioSlug: string,
  layoutType: GalleryLayoutType
) {
  const { supabase, studioId } = await requireGalleryEditMembership()

  const { error } = await supabase
    .from('galleries')
    .update({ layout_type: layoutType, updated_at: new Date().toISOString() })
    .eq('id', galleryId)
    .eq('studio_id', studioId)

  if (error) {
    console.error('Update gallery layout error:', error)
    throw new Error('Failed to save photo layout')
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  redirect(`/dashboard/${studioSlug}/galleries/${galleryId}/design`)
}

export async function updateGalleryCoverTemplate(
  galleryId: string,
  studioSlug: string,
  coverTemplate: GalleryCoverTemplate
): Promise<{ success: true } | { error: string }> {
  let supabase, studioId: string
  try {
    ;({ supabase, studioId } = await requireGalleryEditMembership())
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { error } = await supabase
    .from('galleries')
    .update({ cover_template: coverTemplate, updated_at: new Date().toISOString() })
    .eq('id', galleryId)
    .eq('studio_id', studioId)

  if (error) {
    console.error('Update gallery cover template error:', error)
    return { error: 'Failed to save cover template' }
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}/design`)
  return { success: true }
}

async function requireGalleryAccess(galleryId: string) {
  const { supabase, studioId } = await requireGalleryEditMembership()

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id')
    .eq('id', galleryId)
    .eq('studio_id', studioId)
    .single()

  if (!gallery) {
    throw new Error('Gallery not found')
  }

  return supabase
}

export async function createAlbum(
  galleryId: string,
  studioSlug: string,
  name: string,
  description?: string
): Promise<{ album: GalleryAlbumRow } | { error: string }> {
  let supabase
  try {
    supabase = await requireGalleryAccess(galleryId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { count } = await supabase
    .from('gallery_albums')
    .select('id', { count: 'exact', head: true })
    .eq('gallery_id', galleryId)

  const { data: album, error } = await supabase
    .from('gallery_albums')
    .insert({ gallery_id: galleryId, name, description: description || null, order: count ?? 0 })
    .select('id, name, description, cover_image, media_count, order, created_at')
    .single()

  if (error || !album) {
    console.error('Create album error:', error)
    return { error: 'Failed to create album' }
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  return { album }
}

export async function updateAlbum(
  albumId: string,
  galleryId: string,
  studioSlug: string,
  name: string,
  description?: string
): Promise<{ album: GalleryAlbumRow } | { error: string }> {
  let supabase
  try {
    supabase = await requireGalleryAccess(galleryId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { data: album, error } = await supabase
    .from('gallery_albums')
    .update({ name, description: description || null })
    .eq('id', albumId)
    .eq('gallery_id', galleryId)
    .select('id, name, description, cover_image, media_count, order, created_at')
    .single()

  if (error || !album) {
    console.error('Update album error:', error)
    return { error: 'Failed to update album' }
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  return { album }
}

export async function deleteAlbum(
  albumId: string,
  galleryId: string,
  studioSlug: string
): Promise<{ error: string } | undefined> {
  let supabase
  try {
    supabase = await requireGalleryAccess(galleryId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { error } = await supabase
    .from('gallery_albums')
    .delete()
    .eq('id', albumId)
    .eq('gallery_id', galleryId)

  if (error) {
    console.error('Delete album error:', error)
    return { error: 'Failed to delete album' }
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
}

export async function duplicateAlbum(
  albumId: string,
  galleryId: string,
  studioSlug: string
): Promise<{ album: GalleryAlbumRow } | { error: string }> {
  let supabase
  try {
    supabase = await requireGalleryAccess(galleryId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { data: original } = await supabase
    .from('gallery_albums')
    .select('name, description, cover_image, order')
    .eq('id', albumId)
    .eq('gallery_id', galleryId)
    .single()

  if (!original) return { error: 'Album not found' }

  const { data: album, error } = await supabase
    .from('gallery_albums')
    .insert({
      gallery_id: galleryId,
      name: `${original.name} (Copy)`,
      description: original.description,
      cover_image: original.cover_image,
      order: original.order,
    })
    .select('id, name, description, cover_image, media_count, order, created_at')
    .single()

  if (error || !album) {
    console.error('Duplicate album error:', error)
    return { error: 'Failed to duplicate album' }
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  return { album }
}

export async function assignMediaToAlbum(
  mediaIds: string[],
  albumId: string | null,
  galleryId: string,
  studioSlug: string
): Promise<{ albums: GalleryAlbumRow[] } | { error: string }> {
  let supabase
  try {
    supabase = await requireGalleryAccess(galleryId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { error } = await supabase
    .from('media')
    .update({ album_id: albumId })
    .in('id', mediaIds)
    .eq('gallery_id', galleryId)

  if (error) {
    console.error('Assign media to album error:', error)
    return { error: 'Failed to update album' }
  }

  // media_count isn't triggered/generated in the DB, so recompute it for
  // every album in this gallery - media may have moved out of one album
  // and into another, or been unassigned entirely.
  const { data: albums } = await supabase
    .from('gallery_albums')
    .select('id')
    .eq('gallery_id', galleryId)

  for (const a of albums ?? []) {
    const { count } = await supabase
      .from('media')
      .select('id', { count: 'exact', head: true })
      .eq('album_id', a.id)
    await supabase.from('gallery_albums').update({ media_count: count ?? 0 }).eq('id', a.id)
  }

  const { data: updatedAlbums } = await supabase
    .from('gallery_albums')
    .select('id, name, description, cover_image, media_count, order, created_at')
    .eq('gallery_id', galleryId)

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  return { albums: updatedAlbums ?? [] }
}

export async function setMediaFavorite(
  mediaIds: string[],
  isFavorite: boolean,
  galleryId: string,
  studioSlug: string
): Promise<{ success: true } | { error: string }> {
  let supabase
  try {
    supabase = await requireGalleryAccess(galleryId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { error } = await supabase
    .from('media')
    .update({ is_favorite: isFavorite })
    .in('id', mediaIds)
    .eq('gallery_id', galleryId)

  if (error) {
    console.error('Set media favorite error:', error)
    return { error: 'Failed to update favorites' }
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  return { success: true }
}

export async function deleteMedia(
  mediaIds: string[],
  galleryId: string,
  studioSlug: string
): Promise<{ success: true } | { error: string }> {
  let supabase
  try {
    supabase = await requireGalleryAccess(galleryId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { error } = await supabase
    .from('media')
    .delete()
    .in('id', mediaIds)
    .eq('gallery_id', galleryId)

  if (error) {
    console.error('Delete media error:', error)
    return { error: 'Failed to delete images' }
  }

  const { count } = await supabase
    .from('media')
    .select('id', { count: 'exact', head: true })
    .eq('gallery_id', galleryId)

  await supabase
    .from('galleries')
    .update({ media_count: count ?? 0, updated_at: new Date().toISOString() })
    .eq('id', galleryId)

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  return { success: true }
}
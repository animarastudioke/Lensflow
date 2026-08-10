'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Types
export type GalleryType = 'wedding' | 'portrait' | 'commercial' | 'event' | 'other'
export type GalleryStatus = 'draft' | 'published' | 'archived' | 'private'

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
  created_at: string
  updated_at: string
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
    name: formData.get('name') || existing.name,
    description: formData.get('description') === '' ? null : (formData.get('description') as string) || existing.description,
    type: formData.get('type') as GalleryType || existing.type,
    shoot_date: formData.get('shoot_date') || existing.shoot_date,
    client_id: formData.get('client_id') || existing.client_id,
    status: formData.get('status') as GalleryStatus || existing.status,
    password_protected: formData.get('password_protected') === 'true',
    password: formData.get('password') || undefined,
    allow_download: formData.get('allow_download') !== 'false',
    allow_comments: formData.get('allow_comments') !== 'false',
    allow_favorites: formData.get('allow_favorites') !== 'false',
    watermark_enabled: formData.get('watermark_enabled') === 'true',
    expiry_days: formData.get('expiry_days') ? Number(formData.get('expiry_days')) : existing.expiry_days,
    seo_title: formData.get('seo_title') || existing.seo_title,
    seo_description: formData.get('seo_description') || existing.seo_description,
    custom_domain: formData.get('custom_domain') || existing.custom_domain,
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

export async function getGallery(galleryId: string, studioSlug: string) {
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
      albums:gallery_albums(id, name, description, cover_image, media_count, order, created_at),
      media:media(id, filename, url, thumbnail_url, type, size, width, height, metadata, is_favorite, comment_count, created_at, album_id)
    `)
    .eq('id', galleryId)
    .eq('studio_id', studio.id)
    .single()

  return gallery
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

  return gallery
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
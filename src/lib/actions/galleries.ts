'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import sharp from 'sharp'
import { canCreateGallery, getEffectivePlan, getSubscriptionAccessState, hasEntitlement, reserveUploadQuota, releaseUploadReservations } from '@/lib/entitlements'
import {
  buildMediaKey,
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  deleteObject,
  deleteObjects,
  deleteObjectsByPrefix,
  downloadObject,
  getR2PublicUrl,
  headObject,
  uploadObject,
} from '@/lib/storage/r2'
import { sendEmail } from '@/lib/email/resend'
import { galleryPublishedEmail } from '@/lib/email/templates'
import { mapWithConcurrency } from '@/lib/utils/concurrency'
import { hashGalleryPassword, verifyGalleryPasswordHash } from '@/lib/security/gallery-password'

// Types
export type GalleryType = 'wedding' | 'portrait' | 'commercial' | 'event' | 'other'
export type GalleryStatus = 'draft' | 'published' | 'archived' | 'private'
export type GalleryLayoutType = 'grid' | 'masonry' | 'justified'
export type GalleryCoverTemplate = 'novel' | 'vintage' | 'frame' | 'stripe' | 'divider' | 'journal' | 'stamp' | 'outline'
export type GalleryHeadingFont = 'default' | 'playfair' | 'cormorant' | 'archivo' | 'bodoni'

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
  heading_font: GalleryHeadingFont
  created_at: string
  updated_at: string
}

export interface GalleryMediaRow {
  id: string
  filename: string
  url: string
  thumbnail_url: string | null
  type: 'image' | 'video'
  original_key: string | null
  /** Presigned, no-Content-Disposition playback URL — only set for video items, computed at read time. */
  video_playback_url?: string
  size: number | null
  width: number | null
  height: number | null
  is_favorite: boolean
  album_id: string | null
  created_at: string
}

/**
 * Video has no public "preview" render the way photos do — the original file
 * itself is what plays. Rather than making video originals public (breaking
 * the "no public URLs for originals" rule the download route relies on),
 * attach a long-expiry presigned GET URL with no filename param, so no
 * Content-Disposition header is set and browsers stream it inline instead of
 * forcing a download.
 */
async function attachVideoPlaybackUrls<T extends { type: 'image' | 'video'; original_key: string | null }>(
  media: T[]
): Promise<(T & { video_playback_url?: string })[]> {
  return Promise.all(
    media.map(async (item) => {
      if (item.type !== 'video' || !item.original_key) return item
      const video_playback_url = await createPresignedDownloadUrl(item.original_key, undefined, 14400)
      return { ...item, video_playback_url }
    })
  )
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
    passwordHash = await hashGalleryPassword(validated.password)
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
    passwordHash = await hashGalleryPassword(validated.password)
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

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id')
    .eq('id', galleryId)
    .eq('studio_id', studio.id)
    .single()

  if (!gallery) {
    throw new Error('Gallery not found')
  }

  // The gallery row itself is soft-deleted (kept as 'archived' for booking/
  // client history), but its media must actually be removed — both the R2
  // objects and the DB rows — or the studio's storage quota (a live SUM
  // over media.storage_bytes) never gets released and the objects sit in
  // the bucket forever.
  await deleteObjectsByPrefix(`studios/${studio.id}/galleries/${galleryId}/`).catch((r2Error) => {
    console.error('Failed to delete gallery R2 objects:', r2Error)
  })

  await supabase.from('media').delete().eq('gallery_id', galleryId)

  const { error } = await supabase
    .from('galleries')
    .update({
      status: 'archived',
      media_count: 0,
      cover_image: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', galleryId)
    .eq('studio_id', studio.id)

  if (error) {
    throw new Error('Failed to delete gallery')
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries`)
  return { success: true }
}

export async function updateGalleryStatus(
  galleryId: string,
  studioSlug: string,
  status: GalleryStatus
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return { error: 'Studio not found' }

  const hasPermission = await checkGalleryPermission(studio.id, user.id, 'galleries.edit')
  if (!hasPermission) return { error: 'Insufficient permissions to update gallery' }

  const { data: existing } = await supabase
    .from('galleries')
    .select('status, name, share_token, client:clients(name, email)')
    .eq('id', galleryId)
    .eq('studio_id', studio.id)
    .single()

  const { error } = await supabase
    .from('galleries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', galleryId)
    .eq('studio_id', studio.id)

  if (error) return { error: 'Failed to update gallery status' }

  // Only on the transition into 'published', not every re-save of an
  // already-published gallery — otherwise editing settings would re-notify
  // the client every time.
  if (status === 'published' && existing && existing.status !== 'published') {
    const client = existing.client as unknown as { name: string; email: string } | null
    if (client?.email && existing.share_token) {
      const { data: studioBranding } = await supabase
        .from('studios')
        .select('name, logo_url, brand_color')
        .eq('id', studio.id)
        .single()
      if (studioBranding) {
        const { subject, html } = galleryPublishedEmail({
          studio: { name: studioBranding.name, logoUrl: studioBranding.logo_url, brandColor: studioBranding.brand_color },
          clientName: client.name,
          galleryName: existing.name,
          shareToken: existing.share_token,
        })
        const result = await sendEmail({ to: client.email, subject, html })
        if (!result.success) console.error('Failed to send gallery-published email:', result.error)
      }
    }
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
      media:media(id, filename, url, thumbnail_url, type, original_key, size, width, height, is_favorite, album_id, created_at)
    `)
    .eq('id', galleryId)
    .eq('studio_id', studio.id)
    .single()

  if (!gallery) return null

  const media = await attachVideoPlaybackUrls((gallery.media ?? []) as GalleryMediaRow[])

  return { ...(gallery as unknown as GalleryDetailRow), media }
}

function computeGalleryExpired(expiryDays: number | null, createdAt: string | null): boolean {
  if (!expiryDays || !createdAt) return false
  const created = new Date(createdAt)
  const expiry = new Date(created.getTime() + expiryDays * 24 * 60 * 60 * 1000)
  return new Date() > expiry
}

export interface GalleryGateInfo {
  id: string
  studio_id: string
  name: string
  description: string | null
  seo_title: string | null
  seo_description: string | null
  cover_image: string | null
  cover_template: GalleryCoverTemplate
  heading_font: GalleryHeadingFont | null
  password_protected: boolean
  expired: boolean
  studio: { name: string; slug: string; logo_url: string | null; brand_color: string | null } | null
}

/**
 * Safe-to-render-before-authorization subset of a public gallery: enough to
 * draw the password gate / expired-gallery screen (name, branding, cover
 * image) without the media list, client PII, share_token, or any password
 * hash. Deliberately never includes `media`, `client`, or `share_settings` —
 * those only come from getGalleryByToken, and only once the caller is known
 * to be authorized (not password-protected, or password already verified).
 * Uses the service-role client because anonymous visitors have no RLS SELECT
 * access on `galleries` at all (see migration 031) — this function itself,
 * not RLS, is what enforces "token holder only, minimal fields only".
 */
export async function getGalleryGateInfo(shareToken: string): Promise<GalleryGateInfo | null> {
  const { data: gallery } = await supabaseAdmin
    .from('galleries')
    .select(`
      id, studio_id, name, description, seo_title, seo_description, cover_image,
      cover_template, heading_font, password_protected, expiry_days, created_at,
      studio:studios(name, slug, logo_url, brand_color)
    `)
    .eq('share_token', shareToken)
    .eq('status', 'published')
    .single()

  if (!gallery) return null

  return {
    id: gallery.id,
    studio_id: gallery.studio_id,
    name: gallery.name,
    description: gallery.description,
    seo_title: gallery.seo_title,
    seo_description: gallery.seo_description,
    cover_image: gallery.cover_image,
    cover_template: gallery.cover_template,
    heading_font: gallery.heading_font,
    password_protected: gallery.password_protected,
    expired: computeGalleryExpired(gallery.expiry_days, gallery.created_at),
    studio: (gallery.studio as unknown as GalleryGateInfo['studio']) ?? null,
  }
}

/**
 * Full public gallery payload — media, client, share settings, entitlements.
 * Only ever call this once the caller is known to be authorized: the
 * gallery isn't password-protected, or verifyGalleryPassword() has already
 * returned true for the password they supplied. Callers that need to decide
 * whether to show a password gate first should call getGalleryGateInfo()
 * instead, which never returns media/client/secrets.
 *
 * Uses the service-role client — see getGalleryGateInfo's comment; there is
 * deliberately no anon RLS SELECT policy on galleries/media/
 * gallery_share_settings for this to rely on (migration 031).
 */
export async function getGalleryByToken(shareToken: string) {
  const { data: gallery } = await supabaseAdmin
    .from('galleries')
    .select(`
      *,
      studio:studios(id, name, slug, logo_url, brand_color),
      client:clients(id, name, email),
      share_settings:gallery_share_settings(*),
      albums:gallery_albums(id, name, description, cover_image, media_count, order, created_at),
      media:media(id, filename, url, thumbnail_url, type, original_key, size, width, height, metadata, is_favorite, comment_count, created_at, album_id)
    `)
    .eq('share_token', shareToken)
    .eq('status', 'published')
    .single()

  if (!gallery) return null

  // password_hash is selected (via `*`) both on the gallery row itself and
  // on the embedded share_settings row, purely because verifyGalleryPassword
  // needs it elsewhere — it must never actually leave the server. This
  // object is passed as a prop straight into a Client Component, so
  // anything left on it here is serialized to the browser regardless of
  // whether the UI renders it, verified visitor or not.
  const rawShareSettings = gallery.share_settings as unknown as (Record<string, unknown> & { password_hash?: unknown }) | Array<Record<string, unknown> & { password_hash?: unknown }> | null
  const shareSettings = Array.isArray(rawShareSettings)
    ? rawShareSettings.map(({ password_hash: _ph, ...rest }) => rest)
    : rawShareSettings
      ? (({ password_hash: _ph, ...rest }) => rest)(rawShareSettings)
      : rawShareSettings
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it below
  const { password_hash: _galleryPasswordHash, ...galleryWithoutHash } = gallery

  const expired = computeGalleryExpired(gallery.expiry_days, gallery.created_at)

  // Resolved server-side so the client never decides for itself whether
  // downloads/branding are allowed — it only renders what this says. Not
  // meaningful once expired, but always computed so the return shape is
  // consistent regardless of which branch below runs.
  const plan = await getEffectivePlan(gallery.studio_id)
  const entitlements = {
    canDownloadOriginals: plan.canDownloadOriginals,
    canBulkDownload: plan.canBulkDownload,
    showPoweredByBadge: plan.showPoweredByBadge,
  }

  // original_key (the server-generated R2 storage key) is needed above to
  // resolve video playback URLs, but must not leave the server beyond that —
  // same reasoning as password_hash above. Downloads instead resolve
  // original_key server-side, from media.id, via
  // /api/storage/[assetId]/download.
  const mediaWithPlayback = expired
    ? []
    : await attachVideoPlaybackUrls((gallery.media ?? []) as unknown as GalleryMediaRow[])
  const media = mediaWithPlayback.map(({ original_key: _originalKey, ...rest }) => rest)

  return { ...galleryWithoutHash, share_settings: shareSettings, media, entitlements, expired }
}

/**
 * Verifies a password against the gallery's stored hash. Returns true (no
 * password needed) when the gallery isn't password-protected. Used both by
 * the public gallery page and, for downloads, by the storage/bulk-download
 * routes — always re-verify the actual password there too rather than
 * trusting a client-asserted "already verified" flag.
 *
 * Transparently upgrades a legacy SHA-256 hash to Argon2id the moment it's
 * confirmed correct — never on a failed attempt, and never for a hash that's
 * already Argon2id. The rehash write is scoped to `gallery.id` as read back
 * from this exact row (never the caller-supplied shareToken/password), so a
 * successful verification can only ever upgrade the row it just checked.
 * The rehash is best-effort: if it fails, the (already-correct) verification
 * result is still returned — a client should never see a rehash failure as
 * "wrong password".
 */
export async function verifyGalleryPassword(shareToken: string, password: string): Promise<boolean> {
  const { data: gallery } = await supabaseAdmin
    .from('galleries')
    .select('id, password_hash, password_protected')
    .eq('share_token', shareToken)
    .single()

  if (!gallery || !gallery.password_protected) return true
  if (!gallery.password_hash) return false

  const { valid, needsRehash } = await verifyGalleryPasswordHash(password, gallery.password_hash)

  if (valid && needsRehash) {
    const upgradedHash = await hashGalleryPassword(password)
    const { error: rehashError } = await supabaseAdmin
      .from('galleries')
      .update({ password_hash: upgradedHash })
      .eq('id', gallery.id)
    if (rehashError) {
      console.error('Gallery password lazy-rehash failed:', rehashError)
    }
  }

  return valid
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
/**
 * Authenticated, tenant-scoped share-settings lookup. Resolves the
 * gallery's *actual* owning studio_id from the gallery row itself (not just
 * the caller-supplied studioSlug) so a gallery belonging to a different
 * studio can never be reached here — even by an authenticated member of
 * some other studio who happens to pass their own studioSlug alongside a
 * galleryId they don't own.
 */
export async function getShareSettings(galleryId: string, studioSlug: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  const { data: membership } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', studio.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return null

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id')
    .eq('id', galleryId)
    .eq('studio_id', studio.id)
    .single()

  if (!gallery) return null

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
    passwordHash = await hashGalleryPassword(validated.password)
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

async function fetchStudioMemberRole(studioId: string, userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('studio_members')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  return membership?.role ?? null
}

// Helper function to check permissions. Pass `preloadedRole` when the caller
// already fetched the membership row (e.g. right before this call) to skip
// the redundant studio_members lookup.
async function checkGalleryPermission(studioId: string, userId: string, permission: string, preloadedRole?: string): Promise<boolean> {
  const role = preloadedRole ?? (await fetchStudioMemberRole(studioId, userId))
  if (!role) return false

  // Check role permissions hierarchy
  const rolePermissions: Record<string, string[]> = {
    super_admin: ['*'],
    studio_owner: ['galleries.*', 'galleries.create', 'galleries.read', 'galleries.edit', 'galleries.delete'],
    photographer: ['galleries.create', 'galleries.read', 'galleries.edit'],
    team_member: ['galleries.read', 'galleries.edit'],
    editor: ['galleries.read'],
    client: [],
  }

  const permissions = rolePermissions[role] || []
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
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024 // 500MB — generous for a highlight reel, well under Free's 3GB total

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
// short-lived presigned R2 URL obtained from requestGalleryUploadUrls below, then this
// action does the sharp processing server-side by downloading the raw upload from R2 —
// which is not subject to that inbound request-body limit.

/**
 * Issues presigned R2 upload URLs for a batch of files in one round trip.
 * Auth/membership/permission/gallery checks run once for the whole batch
 * (they used to run per file, which meant ~7 sequential DB round trips per
 * photo for a multi-file gallery upload); only the per-file quota
 * reservation + presign — which must stay per file since quota reservation
 * is an atomic, individually-locked operation — run per file, in parallel.
 */
export async function requestGalleryUploadUrls(
  galleryId: string,
  files: { filename: string; contentType: string; sizeBytes: number }[]
): Promise<
  | { results: ({ filename: string } & ({ uploadUrl: string; key: string; mediaId: string } | { error: string }))[] }
  | { error: string }
> {
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

  const hasPermission = await checkGalleryPermission(membership.studio_id, user.id, 'galleries.edit', membership.role)
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

  const studioId = membership.studio_id

  // Fetched once for the whole batch rather than per file — reserveUploadQuota
  // used to refetch both on every single call, which meant a large gallery
  // upload made hundreds of redundant DB round trips before a single byte
  // moved, slow enough to blow past the platform's function timeout.
  const [access, plan] = await Promise.all([getSubscriptionAccessState(studioId), getEffectivePlan(studioId)])

  const results = await mapWithConcurrency(files, 6, async (file) => {
    if (!file.contentType.startsWith('image/')) {
      return { filename: file.filename, error: 'Only image uploads are supported' }
    }

    const mediaId = crypto.randomUUID()

    // Atomically reserves quota for this upload (see migration 021) rather than
    // the old read-then-decide canAcceptUpload check, which two simultaneous
    // near-the-limit uploads could both pass.
    const quota = await reserveUploadQuota(studioId, mediaId, file.sizeBytes, { access, plan })
    if (!quota.allowed) {
      return { filename: file.filename, error: quota.reason }
    }

    const key = buildMediaKey({
      studioId,
      galleryId,
      mediaId,
      variant: 'raw',
      extension: fileExtension(file.filename),
    })

    const uploadUrl = await createPresignedUploadUrl(key, file.contentType)
    return { filename: file.filename, uploadUrl, key, mediaId }
  })

  return { results }
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

  const hasPermission = await checkGalleryPermission(membership.studio_id, user.id, 'galleries.edit', membership.role)
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

  type MediaRow = {
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
  }

  // Each file requires a download + two sharp encodes + up to three uploads —
  // heavy enough that running the whole batch one file at a time made a
  // multi-photo gallery upload take roughly N times as long as necessary.
  // A small worker pool keeps memory/CPU bounded while still overlapping
  // network I/O across files.
  const processed = await mapWithConcurrency(uploads, 4, async (upload): Promise<MediaRow | null> => {
    if (!upload.key.startsWith(expectedPrefix) || !upload.key.includes(`/assets/${upload.mediaId}/`)) return null

    let buffer: Buffer
    try {
      buffer = await downloadObject(upload.key)
    } catch (downloadError) {
      console.error('Gallery media download error:', downloadError)
      return null
    }

    const image = sharp(buffer)
    const metadata = await image.metadata()

    const [previewBuffer, thumbBuffer] = await Promise.all([
      image
        .resize({ width: MAX_UPLOAD_DIMENSION, height: MAX_UPLOAD_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer(),
      sharp(buffer)
        .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
    ])

    const previewKey = buildMediaKey({ studioId, galleryId, mediaId: upload.mediaId, variant: 'preview', extension: 'webp' })
    const thumbKey = buildMediaKey({ studioId, galleryId, mediaId: upload.mediaId, variant: 'thumb', extension: 'webp' })

    try {
      await Promise.all([
        uploadObject(previewKey, previewBuffer, 'image/webp'),
        uploadObject(thumbKey, thumbBuffer, 'image/webp'),
      ])
    } catch (uploadError) {
      console.error('Gallery media upload error:', uploadError)
      return null
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

    return {
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
    }
  })

  const rows = processed.filter((row): row is MediaRow => row !== null)

  // Every reservation from requestGalleryUploadUrls for this batch is done
  // its job now — the successful ones are about to become real media rows
  // (counted for real via the storage view) and the skipped ones failed
  // processing, so neither should keep holding quota until their TTL expires.
  const allMediaIds = uploads.map((u) => u.mediaId)

  if (rows.length === 0) {
    await releaseUploadReservations(allMediaIds)
    return { error: 'No valid image files were uploaded' }
  }

  const { error: insertError } = await supabase.from('media').insert(rows)

  if (insertError) {
    console.error('Insert media rows error:', insertError)
    await releaseUploadReservations(allMediaIds)
    return { error: 'Failed to save uploaded media' }
  }

  await releaseUploadReservations(allMediaIds)

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

// Video uploads deliberately skip the photo pipeline's download-into-memory +
// sharp-reprocess step: a 500MB video would blow past a serverless function's
// memory/time budget, and there is no reliable way to transcode video on
// Vercel serverless anyway. Instead the browser uploads the video file
// straight to its final R2 key, and separately captures + uploads a poster
// frame (via <video> + <canvas>, see UploadGalleryFlow.tsx) using the same
// preview/thumb key convention as photos — so the existing public-preview
// rendering paths (gallery grids, cover images) work unmodified for video.
export async function requestVideoUploadUrls(
  galleryId: string,
  files: { filename: string; contentType: string; sizeBytes: number }[]
): Promise<
  | {
      results: ({ filename: string } & (
        | {
            mediaId: string
            videoUploadUrl: string
            videoKey: string
            posterPreviewUploadUrl: string
            posterPreviewKey: string
            posterThumbUploadUrl: string
            posterThumbKey: string
          }
        | { error: string }
      ))[]
    }
  | { error: string }
> {
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

  const hasPermission = await checkGalleryPermission(membership.studio_id, user.id, 'galleries.edit', membership.role)
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

  const studioId = membership.studio_id

  // See requestGalleryUploadUrls above — fetched once per batch instead of
  // once per file to avoid hundreds of redundant DB round trips.
  const [access, plan] = await Promise.all([getSubscriptionAccessState(studioId), getEffectivePlan(studioId)])

  const results = await mapWithConcurrency(files, 4, async (file) => {
    if (!file.contentType.startsWith('video/')) {
      return { filename: file.filename, error: 'Only video uploads are supported' }
    }
    if (file.sizeBytes > MAX_VIDEO_SIZE_BYTES) {
      return { filename: file.filename, error: `Video exceeds the ${Math.round(MAX_VIDEO_SIZE_BYTES / (1024 * 1024))}MB limit` }
    }

    const mediaId = crypto.randomUUID()

    const quota = await reserveUploadQuota(studioId, mediaId, file.sizeBytes, { access, plan })
    if (!quota.allowed) {
      return { filename: file.filename, error: quota.reason }
    }

    const videoKey = buildMediaKey({ studioId, galleryId, mediaId, variant: 'original', extension: fileExtension(file.filename) })
    const posterPreviewKey = buildMediaKey({ studioId, galleryId, mediaId, variant: 'preview', extension: 'webp' })
    const posterThumbKey = buildMediaKey({ studioId, galleryId, mediaId, variant: 'thumb', extension: 'webp' })

    const [videoUploadUrl, posterPreviewUploadUrl, posterThumbUploadUrl] = await Promise.all([
      createPresignedUploadUrl(videoKey, file.contentType, 3600),
      createPresignedUploadUrl(posterPreviewKey, 'image/webp'),
      createPresignedUploadUrl(posterThumbKey, 'image/webp'),
    ])

    return {
      filename: file.filename,
      mediaId,
      videoUploadUrl,
      videoKey,
      posterPreviewUploadUrl,
      posterPreviewKey,
      posterThumbUploadUrl,
      posterThumbKey,
    }
  })

  return { results }
}

export async function finalizeVideoUpload(
  galleryId: string,
  studioSlug: string,
  uploads: {
    mediaId: string
    videoKey: string
    posterPreviewKey: string
    posterThumbKey: string
    filename: string
    width: number
    height: number
  }[]
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

  const hasPermission = await checkGalleryPermission(membership.studio_id, user.id, 'galleries.edit', membership.role)
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

  type MediaRow = {
    id: string
    gallery_id: string
    filename: string
    url: string
    thumbnail_url: string
    original_key: string
    type: 'video'
    size: number
    storage_bytes: number
    width: number
    height: number
  }

  // Never trust the client's reported file size for what gets charged
  // against the studio's storage quota — HEAD the objects it claims to have
  // uploaded and use R2's own ContentLength. A cheap existence check too:
  // an upload that never actually landed doesn't get a phantom media row.
  const processed = await mapWithConcurrency(uploads, 4, async (upload): Promise<MediaRow | null> => {
    if (!upload.videoKey.startsWith(expectedPrefix) || !upload.videoKey.includes(`/assets/${upload.mediaId}/`)) return null
    if (!upload.posterPreviewKey.startsWith(expectedPrefix) || !upload.posterThumbKey.startsWith(expectedPrefix)) return null

    const [video, preview, thumb] = await Promise.all([
      headObject(upload.videoKey),
      headObject(upload.posterPreviewKey),
      headObject(upload.posterThumbKey),
    ])

    if (!video.exists || !preview.exists || !thumb.exists) return null

    return {
      id: upload.mediaId,
      gallery_id: galleryId,
      filename: upload.filename,
      url: getR2PublicUrl(upload.posterPreviewKey),
      thumbnail_url: getR2PublicUrl(upload.posterThumbKey),
      original_key: upload.videoKey,
      type: 'video',
      size: video.sizeBytes,
      storage_bytes: video.sizeBytes + preview.sizeBytes + thumb.sizeBytes,
      width: upload.width,
      height: upload.height,
    }
  })

  const rows = processed.filter((row): row is MediaRow => row !== null)

  const allMediaIds = uploads.map((u) => u.mediaId)

  if (rows.length === 0) {
    await releaseUploadReservations(allMediaIds)
    return { error: 'No valid video files were uploaded' }
  }

  const { error: insertError } = await supabase.from('media').insert(rows)

  if (insertError) {
    console.error('Insert video media rows error:', insertError)
    await releaseUploadReservations(allMediaIds)
    return { error: 'Failed to save uploaded video' }
  }

  await releaseUploadReservations(allMediaIds)

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

/**
 * Lets a studio pick which uploaded photo is the gallery's cover, instead of
 * always defaulting to the first photo uploaded (finalizeGalleryMediaUpload's
 * fallback). coverImageUrl must be one of this gallery's own media preview
 * URLs — checked against the media table, not trusted from the client.
 */
export async function updateGalleryCoverImage(
  galleryId: string,
  studioSlug: string,
  coverImageUrl: string
): Promise<{ success: true } | { error: string }> {
  let supabase, studioId: string
  try {
    ;({ supabase, studioId } = await requireGalleryEditMembership())
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { data: media } = await supabase
    .from('media')
    .select('id')
    .eq('gallery_id', galleryId)
    .eq('url', coverImageUrl)
    .maybeSingle()

  if (!media) {
    return { error: 'That photo is not part of this gallery' }
  }

  const { error } = await supabase
    .from('galleries')
    .update({ cover_image: coverImageUrl, updated_at: new Date().toISOString() })
    .eq('id', galleryId)
    .eq('studio_id', studioId)

  if (error) {
    console.error('Update gallery cover image error:', error)
    return { error: 'Failed to save cover photo' }
  }

  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}`)
  revalidatePath(`/dashboard/${studioSlug}/galleries/${galleryId}/design`)
  return { success: true }
}

export async function updateGalleryHeadingFont(
  galleryId: string,
  studioSlug: string,
  headingFont: GalleryHeadingFont
): Promise<{ success: true } | { error: string }> {
  let supabase, studioId: string
  try {
    ;({ supabase, studioId } = await requireGalleryEditMembership())
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { error } = await supabase
    .from('galleries')
    .update({ heading_font: headingFont, updated_at: new Date().toISOString() })
    .eq('id', galleryId)
    .eq('studio_id', studioId)

  if (error) {
    console.error('Update gallery heading font error:', error)
    return { error: 'Failed to save typography' }
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

  return { supabase, studioId }
}

export async function createAlbum(
  galleryId: string,
  studioSlug: string,
  name: string,
  description?: string
): Promise<{ album: GalleryAlbumRow } | { error: string }> {
  let supabase
  try {
    ;({ supabase } = await requireGalleryAccess(galleryId))
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
    ;({ supabase } = await requireGalleryAccess(galleryId))
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
    ;({ supabase } = await requireGalleryAccess(galleryId))
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
    ;({ supabase } = await requireGalleryAccess(galleryId))
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
    ;({ supabase } = await requireGalleryAccess(galleryId))
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
    ;({ supabase } = await requireGalleryAccess(galleryId))
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
  let supabase, studioId
  try {
    ;({ supabase, studioId } = await requireGalleryAccess(galleryId))
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const { data: rowsToDelete } = await supabase
    .from('media')
    .select('id, original_key')
    .in('id', mediaIds)
    .eq('gallery_id', galleryId)

  const { error } = await supabase
    .from('media')
    .delete()
    .in('id', mediaIds)
    .eq('gallery_id', galleryId)

  if (error) {
    console.error('Delete media error:', error)
    return { error: 'Failed to delete images' }
  }

  // R2 objects are best-effort cleanup after the DB delete has committed —
  // a failure here leaves an orphaned object (recoverable later) rather than
  // a dangling media row pointing at nothing.
  const keysToDelete = (rowsToDelete ?? []).flatMap((row) => {
    const keys = [
      buildMediaKey({ studioId, galleryId, mediaId: row.id, variant: 'preview', extension: 'webp' }),
      buildMediaKey({ studioId, galleryId, mediaId: row.id, variant: 'thumb', extension: 'webp' }),
    ]
    if (row.original_key) keys.push(row.original_key)
    return keys
  })

  if (keysToDelete.length > 0) {
    await deleteObjects(keysToDelete).catch((r2Error) => {
      console.error('Failed to delete R2 objects for removed media:', r2Error)
    })
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
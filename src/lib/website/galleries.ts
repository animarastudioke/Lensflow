import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isSafeWebsitePreviewUrl, type WebsiteGalleryOption } from './content'

/**
 * Only include galleries already safe to show to an unauthenticated visitor.
 * The same query is used by the editor and public renderer so a site preview
 * doesn't accidentally promise photos that won't be visible after publishing.
 */
export async function getWebsiteGalleryOptions(
  supabase: SupabaseClient,
  studioId: string,
  onlyGalleryIds?: string[],
): Promise<WebsiteGalleryOption[]> {
  if (onlyGalleryIds && onlyGalleryIds.length === 0) return []

  let query = supabase
    .from('galleries')
    .select('id, name, password_protected, expiry_days, created_at')
    .eq('studio_id', studioId)
    .eq('status', 'published')
    .eq('password_protected', false)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (onlyGalleryIds) query = query.in('id', onlyGalleryIds)

  const { data: galleries, error: galleryError } = await query
  if (galleryError || !galleries?.length) return []

  const galleryIds = galleries.map((gallery) => gallery.id)
  const { data: shareSettings } = await supabase
    .from('gallery_share_settings')
    .select('gallery_id, password_protected, require_email, allow_embed, expires_at')
    .in('gallery_id', galleryIds)

  const now = Date.now()
  const blockedIds = new Set((shareSettings ?? [])
    .filter((setting) => setting.password_protected || setting.require_email || !setting.allow_embed || (setting.expires_at && new Date(setting.expires_at).getTime() <= now))
    .map((setting) => setting.gallery_id))
  const publicGalleries = galleries.filter((gallery) => {
    const expiresAt = gallery.expiry_days && gallery.created_at
      ? new Date(gallery.created_at).getTime() + gallery.expiry_days * 24 * 60 * 60 * 1000
      : null
    return !blockedIds.has(gallery.id) && (expiresAt === null || expiresAt > now)
  })
  if (!publicGalleries.length) return []

  const publicGalleryIds = publicGalleries.map((gallery) => gallery.id)
  const { data: media } = await supabase
    .from('media')
    .select('gallery_id, url, thumbnail_url')
    .in('gallery_id', publicGalleryIds)
    .eq('type', 'image')
    .order('created_at', { ascending: true })
    .limit(400)

  const imagesByGallery = new Map<string, WebsiteGalleryOption['images']>()
  for (const item of media ?? []) {
    const src = [item.thumbnail_url, item.url].find(isSafeWebsitePreviewUrl)
    if (!src) continue
    const images = imagesByGallery.get(item.gallery_id) ?? []
    if (images.length >= 12) continue
    images.push({ src, alt: `Portfolio image ${images.length + 1}` })
    imagesByGallery.set(item.gallery_id, images)
  }

  return publicGalleries.flatMap((gallery) => {
    const images = imagesByGallery.get(gallery.id) ?? []
    if (images.length === 0) return []
    return [{ id: gallery.id, name: gallery.name, images }]
  })
}


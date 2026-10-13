import type { CoverTemplate, HeadingFont } from '@/components/galleries/GalleryCoverPreview'

export interface MediaItem {
  id: string
  filename: string
  url: string
  thumbnailUrl: string
  type: 'image' | 'video'
  /** Presigned inline-playback URL — only set for video items. */
  videoPlaybackUrl?: string
  size: number
  width: number
  height: number
  metadata?: {
    camera?: string
    lens?: string
    iso?: number
    aperture?: string
    shutterSpeed?: string
    focalLength?: string
    tags?: string[]
  }
  isFavorite: boolean
  commentCount: number
  createdAt: string
  albumId?: string
}

export interface Album {
  id: string
  name: string
  description?: string
  coverImage?: string
  mediaCount: number
  order: number
  createdAt: string
}

export interface GalleryData {
  id: string
  studio_id: string
  name: string
  description?: string
  cover_image?: string
  type: 'event' | 'portrait' | 'wedding' | 'commercial' | 'other'
  client_name?: string
  shoot_date?: string
  media_count: number
  allow_download: boolean
  allow_comments: boolean
  allow_favorites: boolean
  watermark_enabled: boolean
  password_protected: boolean
  share_token: string
  layout_type: 'grid' | 'masonry' | 'justified'
  cover_template: CoverTemplate
  heading_font?: HeadingFont
  studio?: {
    name: string
    slug: string
    logo_url?: string
    brand_color?: string
  }
  share_settings?: {
    custom_branding: boolean
    brand_name?: string
    brand_logo?: string
    brand_color?: string
    cover_image?: string
    allow_embed: boolean
    embed_width: number
    embed_height: number
    require_email: boolean
    collect_email: boolean
  }
  client?: { id: string; name: string; email: string }
  albums?: Album[]
  media?: MediaItem[]
  entitlements?: {
    canDownloadOriginals: boolean
    canBulkDownload: boolean
    showPoweredByBadge: boolean
  }
}

export type GalleryViewMode = 'editorial' | 'grid'

export interface GalleryBranding {
  name: string
  logo?: string
  color: string
  coverImage?: string
}

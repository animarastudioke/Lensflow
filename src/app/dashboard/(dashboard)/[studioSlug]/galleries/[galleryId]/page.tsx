import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getGallery } from '@/lib/actions/galleries'
import { GalleryDetail, type Gallery } from '@/components/galleries/GalleryDetail'

interface GalleryDetailPageProps {
  params: Promise<{ studioSlug: string; galleryId: string }>
}

export async function generateMetadata({
  params,
}: GalleryDetailPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Gallery - ${studioSlug}`,
    description: 'View and manage gallery',
  }
}

export default async function GalleryDetailPage({ params }: GalleryDetailPageProps) {
  const { studioSlug, galleryId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const gallery = await getGallery(galleryId, studioSlug)

  if (!gallery) {
    notFound()
  }

  const shareSettings = Array.isArray(gallery.share_settings)
    ? gallery.share_settings[0]
    : gallery.share_settings

  const initialGallery: Gallery = {
    id: gallery.id,
    name: gallery.name,
    description: gallery.description ?? undefined,
    status: gallery.status,
    type: gallery.type,
    passwordProtected: gallery.password_protected,
    expiryDays: gallery.expiry_days ?? undefined,
    downloadEnabled: gallery.allow_download,
    watermarkEnabled: gallery.watermark_enabled,
    allowFavorites: gallery.allow_favorites,
    allowComments: gallery.allow_comments,
    requireEmail: shareSettings?.require_email ?? false,
    images: gallery.media.map((media, index) => ({
      id: media.id,
      filename: media.filename,
      url: media.url,
      thumbnailUrl: media.thumbnail_url || media.url,
      width: media.width ?? 0,
      height: media.height ?? 0,
      size: media.size ?? 0,
      mimeType: media.type,
      videoPlaybackUrl: media.video_playback_url,
      isFavorite: media.is_favorite,
      albumId: media.album_id ?? undefined,
      sortOrder: index,
      uploadedAt: media.created_at,
    })),
    albums: gallery.albums.map((album) => ({
      id: album.id,
      name: album.name,
      description: album.description ?? undefined,
      coverImageUrl: album.cover_image ?? undefined,
      imageCount: album.media_count,
      sortOrder: album.order,
      createdAt: album.created_at,
    })),
    clientId: gallery.client?.id,
    clientName: gallery.client?.name,
    clientEmail: gallery.client?.email,
    shootDate: gallery.shoot_date ?? undefined,
    shareToken: gallery.share_token,
    settings: {
      primaryColor: shareSettings?.brand_color || '#3B82F6',
      logoUrl: shareSettings?.brand_logo ?? undefined,
    },
    stats: {
      views: gallery.view_count,
      downloads: gallery.download_count,
      favorites: gallery.media.filter((media) => media.is_favorite).length,
    },
    createdAt: gallery.created_at,
    updatedAt: gallery.updated_at,
  }

  return <GalleryDetail studioSlug={studioSlug} initialGallery={initialGallery} />
}

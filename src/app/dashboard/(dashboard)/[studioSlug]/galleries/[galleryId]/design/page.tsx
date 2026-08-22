import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getGallery } from '@/lib/actions/galleries'
import { GalleryDesignEditor } from '@/components/galleries/GalleryDesignEditor'

interface GalleryDesignPageProps {
  params: Promise<{ studioSlug: string; galleryId: string }>
}

export async function generateMetadata({
  params,
}: GalleryDesignPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Gallery Design - ${studioSlug}`,
    description: 'Choose a cover design for this gallery',
  }
}

export default async function GalleryDesignPage({ params }: GalleryDesignPageProps) {
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

  const branding = shareSettings?.custom_branding
    ? {
        name: shareSettings.brand_name || gallery.studio?.name || 'LensFlow',
        logo: shareSettings.brand_logo || gallery.studio?.logo_url || undefined,
        color: shareSettings.brand_color || gallery.studio?.brand_color || '#3b82f6',
        coverImage: shareSettings.cover_image || gallery.cover_image || undefined,
      }
    : {
        name: gallery.studio?.name || 'LensFlow',
        logo: gallery.studio?.logo_url || undefined,
        color: gallery.studio?.brand_color || '#3b82f6',
        coverImage: gallery.cover_image || undefined,
      }

  return (
    <GalleryDesignEditor
      studioSlug={studioSlug}
      galleryId={gallery.id}
      galleryName={gallery.name}
      galleryStatus={gallery.status}
      shareToken={gallery.share_token}
      initialTemplate={gallery.cover_template}
      initialHeadingFont={gallery.heading_font}
      initialCoverImageUrl={gallery.cover_image}
      media={gallery.media
        .filter((item) => item.type === 'image' && item.url)
        .map((item) => ({ id: item.id, url: item.url, thumbnailUrl: item.thumbnail_url ?? item.url }))}
      previewData={{
        name: gallery.name,
        description: gallery.description,
        clientName: gallery.client?.name,
        dateLabel: gallery.shoot_date
          ? new Date(gallery.shoot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : undefined,
        coverImageUrl: branding.coverImage,
        secondaryImageUrl: gallery.media[1]?.thumbnail_url ?? undefined,
        logoUrl: branding.logo,
        brandName: branding.name,
        brandColor: branding.color,
        headingFont: gallery.heading_font,
      }}
    />
  )
}

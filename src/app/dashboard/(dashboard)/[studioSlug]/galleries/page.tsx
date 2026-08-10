import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { GalleryList } from '@/components/galleries/GalleryList'
import { getGalleries } from '@/lib/actions/galleries'

interface GalleriesPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ page?: string; status?: string; type?: string }>
}

export async function generateMetadata({
  params,
}: GalleriesPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Galleries - ${studioSlug}`,
    description: 'Manage your client galleries',
  }
}

export default async function GalleriesPage({ params }: GalleriesPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null // Layout handles redirect
  }

  const { galleries } = await getGalleries(studioSlug)
  const initialGalleries = galleries.map((g: any) => ({
    id: g.id,
    name: g.name,
    description: g.description ?? undefined,
    coverImage: g.cover_image ?? undefined,
    status: g.status,
    type: g.type,
    clientId: g.client_id ?? undefined,
    clientName: g.client?.name ?? undefined,
    shootDate: g.shoot_date ?? undefined,
    mediaCount: g.media_count,
    viewCount: g.view_count,
    downloadCount: g.download_count,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
    shareToken: g.share_token,
    passwordProtected: g.password_protected,
    expiresAt: g.expiry_days
      ? new Date(new Date(g.created_at).getTime() + g.expiry_days * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
  }))

  return <GalleryList studioSlug={studioSlug} initialGalleries={initialGalleries} />
}
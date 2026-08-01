import { Metadata } from 'next'
import { GalleryList } from '@/components/galleries/GalleryList'
import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Galleries',
  description: 'Manage your photo galleries',
}

interface Props {
  params: Promise<{ studioSlug: string }>
}

export default async function GalleriesPage({ params }: Props) {
  const { studioSlug } = await params
  const user = await getAuthUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display font-bold tracking-tight">
            Galleries
          </h1>
          <p className="text-body text-muted-foreground mt-1">
            Manage and organize your photo galleries
          </p>
        </div>
      </div>

      <GalleryList studioSlug={studioSlug} />
    </div>
  )
}
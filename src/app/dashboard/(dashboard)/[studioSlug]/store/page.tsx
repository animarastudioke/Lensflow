import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { StoreList } from '@/components/store/StoreList'

interface StorePageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}

export async function generateMetadata({
  params,
}: StorePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Store - ${studioSlug}`,
    description: 'Manage your products and orders',
  }
}

export default async function StorePage({ params }: StorePageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  return <StoreList studioSlug={studioSlug} />
}
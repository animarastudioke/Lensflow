import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { getProducts } from '@/lib/actions/products'
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

  const { products } = await getProducts(studioSlug)

  return <StoreList studioSlug={studioSlug} initialProducts={products} />
}
import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NewProductForm } from '@/components/store/NewProductForm'

interface NewProductPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: NewProductPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Product - ${studioSlug}`,
    description: 'Add a new store product',
  }
}

export default async function NewProductPage({ params }: NewProductPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  return <NewProductForm studioSlug={studioSlug} />
}

import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getProduct } from '@/lib/actions/products'
import { EditProductForm } from '@/components/store/EditProductForm'

interface EditProductPageProps {
  params: Promise<{ studioSlug: string; productId: string }>
}

export async function generateMetadata({
  params,
}: EditProductPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Edit Product - ${studioSlug}`,
    description: 'Edit product details',
  }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { studioSlug, productId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const product = await getProduct(productId, studioSlug)

  if (!product) {
    notFound()
  }

  return (
    <EditProductForm
      studioSlug={studioSlug}
      initialValues={{
        id: product.id,
        name: product.name,
        description: product.description ?? '',
        type: product.type,
        status: product.status,
        price: product.price,
        salePrice: product.sale_price,
        cost: product.cost,
        inventory: product.inventory,
        sku: product.sku ?? '',
        featured: product.featured,
        digitalFileName: product.digital_file_name,
      }}
    />
  )
}

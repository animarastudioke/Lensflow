import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getProduct } from '@/lib/actions/products'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'

interface ProductDetailPageProps {
  params: Promise<{ studioSlug: string; productId: string }>
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Product - ${studioSlug}`,
    description: 'View product details',
  }
}

const STATUS_VARIANT = {
  active: 'success',
  draft: 'secondary',
  archived: 'secondary',
} as const

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { studioSlug, productId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [product, currency] = await Promise.all([
    getProduct(productId, studioSlug),
    getStudioCurrency(studioSlug),
  ])

  if (!product) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/${studioSlug}/store`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </Link>
          <h1 className="text-display-md font-display font-semibold text-foreground">{product.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
            <Badge variant="outline" className="text-xs">{product.type}</Badge>
            {product.featured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${studioSlug}/store/products/${product.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      {product.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pricing & inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(product.price, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sale price</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">
                {product.sale_price != null ? formatCurrency(product.sale_price, currency) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cost</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">
                {product.cost != null ? formatCurrency(product.cost, currency) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inventory</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">
                {product.inventory != null ? product.inventory : 'Unlimited'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">SKU</dt>
              <dd className="font-mono font-medium mt-1">{product.sku || '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Sales</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{product.sales_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Revenue</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(product.revenue, currency)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicStore } from '@/lib/actions/storefront'
import { BuyProductDialog } from '@/components/store/BuyProductDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download } from 'lucide-react'

interface StorePageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  const store = await getPublicStore(studioSlug)
  if (!store) return { title: 'Store not found' }
  return {
    title: `${store.studioName} — Store`,
    description: `Digital downloads from ${store.studioName}`,
  }
}

export default async function StorePage({ params }: StorePageProps) {
  const { studioSlug } = await params
  const store = await getPublicStore(studioSlug)

  if (!store) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-8 flex items-center gap-4">
          {store.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt={store.studioName} className="h-12 w-12 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-display-md font-display font-semibold text-foreground">{store.studioName}</h1>
            <p className="text-body-sm text-muted-foreground">Digital downloads</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {!store.acceptingPayments && (
          <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            This store isn&apos;t currently accepting online payments.
          </div>
        )}

        {store.products.length === 0 ? (
          <div className="text-center py-16">
            <Download className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No products available yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {store.products.map((product) => {
              const price = product.salePrice ?? product.price
              return (
                <Card key={product.id}>
                  <CardContent className="pt-6 space-y-3">
                    <div>
                      <h2 className="font-medium text-foreground">{product.name}</h2>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{product.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm">
                        {product.salePrice !== null && product.salePrice < product.price && (
                          <span className="text-muted-foreground line-through mr-2">KES {product.price.toLocaleString()}</span>
                        )}
                        <span className="font-medium text-foreground">KES {price.toLocaleString()}</span>
                      </div>
                      {store.acceptingPayments ? (
                        <BuyProductDialog
                          studioSlug={studioSlug}
                          productId={product.id}
                          productName={product.name}
                          priceKes={price}
                          trigger={<Button size="sm">Buy now</Button>}
                        />
                      ) : (
                        <Button size="sm" disabled>Unavailable</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

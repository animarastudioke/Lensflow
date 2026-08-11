'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createProduct } from '@/lib/actions/products'

interface NewProductFormProps {
  studioSlug: string
}

export function NewProductForm({ studioSlug }: NewProductFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [type, setType] = React.useState('digital')
  const [status, setStatus] = React.useState('draft')
  const [featured, setFeatured] = React.useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('studio_slug', studioSlug)
    formData.set('type', type)
    formData.set('status', status)
    formData.set('featured', String(featured))

    try {
      await createProduct(formData)
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message || 'Failed to create product')
        toast.error(err.message || 'Failed to create product')
        setIsSubmitting(false)
      } else if (!(err instanceof Error)) {
        throw err
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/${studioSlug}/store`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>
        <h1 className="text-display-md font-display font-semibold text-foreground">Add Product</h1>
        <p className="text-body text-muted-foreground mt-1">Add a new product to your store</p>
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Product details</CardTitle>
            <CardDescription>Basic information about this product</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product name</Label>
              <Input id="name" name="name" placeholder="Premium Wedding Album 10x10" required maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="What makes this product great" rows={3} maxLength={2000} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="print">Print</SelectItem>
                    <SelectItem value="album">Album</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" placeholder="e.g. ALB-WED-10X10" maxLength={100} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="featured" checked={featured} onCheckedChange={(checked) => setFeatured(checked === true)} />
              <Label htmlFor="featured" className="font-normal">Feature this product in your store</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pricing & inventory</CardTitle>
            <CardDescription>Set the price and, if applicable, stock on hand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" name="price" type="number" min={0} step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_price">Sale price</Label>
                <Input id="sale_price" name="sale_price" type="number" min={0} step="0.01" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <Input id="cost" name="cost" type="number" min={0} step="0.01" placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventory">Inventory</Label>
              <Input id="inventory" name="inventory" type="number" min={0} step="1" placeholder="Leave blank for unlimited" />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}

        <div className="flex items-center gap-3 mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add product'
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/${studioSlug}/store`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}

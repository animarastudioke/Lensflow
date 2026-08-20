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
import { ArrowLeft, Loader2, UploadCloud, FileCheck2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateProduct, requestProductFileUploadUrl, finalizeProductFileUpload } from '@/lib/actions/products'
import { putWithRetry } from '@/lib/utils/upload'
import { Progress } from '@/components/ui/progress'

interface EditProductFormProps {
  studioSlug: string
  initialValues: {
    id: string
    name: string
    description: string
    type: string
    status: string
    price: number
    salePrice: number | null
    cost: number | null
    inventory: number | null
    sku: string
    featured: boolean
    digitalFileName: string | null
  }
}

const MAX_DIGITAL_FILE_SIZE_BYTES = 524288000 // 500MB, matches the gallery video cap

export function EditProductForm({ studioSlug, initialValues }: EditProductFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [type, setType] = React.useState(initialValues.type)
  const [status, setStatus] = React.useState(initialValues.status)
  const [featured, setFeatured] = React.useState(initialValues.featured)
  const [digitalFileName, setDigitalFileName] = React.useState(initialValues.digitalFileName)
  const [isUploadingFile, setIsUploadingFile] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_DIGITAL_FILE_SIZE_BYTES) {
      toast.error('File exceeds the 500MB limit')
      return
    }

    setIsUploadingFile(true)
    setUploadProgress(0)
    try {
      const presigned = await requestProductFileUploadUrl(studioSlug, initialValues.id, file.name, file.type || 'application/octet-stream')
      if ('error' in presigned) {
        toast.error(presigned.error)
        return
      }

      const putResponse = await putWithRetry(
        presigned.uploadUrl,
        file,
        file.type || 'application/octet-stream',
        (loaded, total) => setUploadProgress(Math.round((loaded / total) * 100))
      )
      if (!putResponse.ok) {
        toast.error('Upload failed. Try again.')
        return
      }

      const result = await finalizeProductFileUpload(studioSlug, initialValues.id, presigned.key, file.name)
      if ('error' in result) {
        toast.error(result.error)
        return
      }

      setDigitalFileName(file.name)
      toast.success('File uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsUploadingFile(false)
    }
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('id', initialValues.id)
    formData.set('studio_slug', studioSlug)
    formData.set('type', type)
    formData.set('status', status)
    formData.set('featured', String(featured))

    try {
      await updateProduct(formData)
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message || 'Failed to update product')
        toast.error(err.message || 'Failed to update product')
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
          href={`/dashboard/${studioSlug}/store/products/${initialValues.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to product
        </Link>
        <h1 className="text-display-md font-display font-semibold text-foreground">Edit Product</h1>
        <p className="text-body text-muted-foreground mt-1">Update this product&apos;s details</p>
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
              <Input id="name" name="name" defaultValue={initialValues.name} required maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={initialValues.description} rows={3} maxLength={2000} />
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
              <Input id="sku" name="sku" defaultValue={initialValues.sku} placeholder="e.g. ALB-WED-10X10" maxLength={100} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="featured" checked={featured} onCheckedChange={(checked) => setFeatured(checked === true)} />
              <Label htmlFor="featured" className="font-normal">Feature this product in your store</Label>
            </div>
          </CardContent>
        </Card>

        {type === 'digital' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Digital file</CardTitle>
              <CardDescription>The file a client receives immediately after paying. Required to sell this product online.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {digitalFileName && (
                <div className="flex items-center gap-2 text-sm text-foreground rounded-md border border-border bg-muted/30 px-3 py-2">
                  <FileCheck2 className="h-4 w-4 text-success shrink-0" />
                  <span className="truncate">{digitalFileName}</span>
                </div>
              )}
              <div>
                <input
                  type="file"
                  id="digital-file"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploadingFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingFile}
                  onClick={() => document.getElementById('digital-file')?.click()}
                >
                  {isUploadingFile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 mr-2" />
                      {digitalFileName ? 'Replace file' : 'Upload file'}
                    </>
                  )}
                </Button>
                {isUploadingFile && (
                  <div className="mt-2 space-y-1 max-w-xs">
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">Up to 500MB. Uploaded directly, never made public — only paying customers get a download link.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pricing & inventory</CardTitle>
            <CardDescription>Set the price and, if applicable, stock on hand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" name="price" type="number" min={0} step="0.01" defaultValue={initialValues.price} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_price">Sale price</Label>
                <Input id="sale_price" name="sale_price" type="number" min={0} step="0.01" defaultValue={initialValues.salePrice ?? ''} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <Input id="cost" name="cost" type="number" min={0} step="0.01" defaultValue={initialValues.cost ?? ''} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventory">Inventory</Label>
              <Input id="inventory" name="inventory" type="number" min={0} step="1" defaultValue={initialValues.inventory ?? ''} placeholder="Leave blank for unlimited" />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}

        <div className="flex items-center gap-3 mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/${studioSlug}/store/products/${initialValues.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}

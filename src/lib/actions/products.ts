'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

export type ProductType = 'digital' | 'print' | 'album' | 'package' | 'service'
export type ProductStatus = 'active' | 'draft' | 'archived'

export interface ProductRow {
  id: string
  studio_id: string
  name: string
  description: string | null
  type: ProductType
  status: ProductStatus
  price: number
  sale_price: number | null
  cost: number | null
  inventory: number | null
  sku: string | null
  images: string[]
  tags: string[]
  featured: boolean
  sales_count: number
  revenue: number
  created_at: string
  updated_at: string
}

async function getStudioId(studioSlug: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()
  return studio?.id ?? null
}

export async function getProduct(productId: string, studioSlug: string): Promise<ProductRow | null> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return null

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('studio_id', studioId)
    .single()

  return product
}

export async function getProducts(studioSlug: string): Promise<{ products: ProductRow[]; total: number }> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return { products: [], total: 0 }

  const { data: products, count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get products error:', error)
    return { products: [], total: 0 }
  }

  return { products: products || [], total: count || 0 }
}

const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['digital', 'print', 'album', 'package', 'service']).default('digital'),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
  price: z.number().min(0).default(0),
  sale_price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  inventory: z.number().int().min(0).optional(),
  sku: z.string().max(100).optional(),
  featured: z.boolean().default(false),
})

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const studioSlug = formData.get('studio_slug') as string

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    throw new Error('No active studio membership')
  }

  const priceRaw = formData.get('price')
  const salePriceRaw = formData.get('sale_price')
  const costRaw = formData.get('cost')
  const inventoryRaw = formData.get('inventory')

  const rawData = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    type: formData.get('type') || 'digital',
    status: formData.get('status') || 'draft',
    price: priceRaw ? Number(priceRaw) : 0,
    sale_price: salePriceRaw ? Number(salePriceRaw) : undefined,
    cost: costRaw ? Number(costRaw) : undefined,
    inventory: inventoryRaw ? Number(inventoryRaw) : undefined,
    sku: formData.get('sku') || undefined,
    featured: formData.get('featured') === 'true',
  }

  const validated = productCreateSchema.parse(rawData)

  const { error } = await supabase
    .from('products')
    .insert({
      studio_id: membership.studio_id,
      name: validated.name,
      description: validated.description,
      type: validated.type,
      status: validated.status,
      price: validated.price,
      sale_price: validated.sale_price,
      cost: validated.cost,
      inventory: validated.inventory,
      sku: validated.sku,
      featured: validated.featured,
    })

  if (error) {
    console.error('Create product error:', error)
    throw new Error('Failed to create product')
  }

  revalidatePath(`/dashboard/${studioSlug}/store`)
  redirect(`/dashboard/${studioSlug}/store`)
}

const productUpdateSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['digital', 'print', 'album', 'package', 'service']),
  status: z.enum(['active', 'draft', 'archived']),
  price: z.number().min(0),
  sale_price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  inventory: z.number().int().min(0).optional(),
  sku: z.string().max(100).optional(),
  featured: z.boolean(),
})

export async function updateProduct(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const id = formData.get('id') as string
  const studioSlug = formData.get('studio_slug') as string

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    throw new Error('No active studio membership')
  }

  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('id', id)
    .eq('studio_id', membership.studio_id)
    .single()

  if (!existing) {
    throw new Error('Product not found')
  }

  const priceRaw = formData.get('price')
  const salePriceRaw = formData.get('sale_price')
  const costRaw = formData.get('cost')
  const inventoryRaw = formData.get('inventory')

  const rawData = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    type: formData.get('type'),
    status: formData.get('status'),
    price: priceRaw ? Number(priceRaw) : 0,
    sale_price: salePriceRaw ? Number(salePriceRaw) : undefined,
    cost: costRaw ? Number(costRaw) : undefined,
    inventory: inventoryRaw ? Number(inventoryRaw) : undefined,
    sku: formData.get('sku') || undefined,
    featured: formData.get('featured') === 'true',
  }

  const validated = productUpdateSchema.parse(rawData)

  const { error } = await supabase
    .from('products')
    .update({
      name: validated.name,
      description: validated.description ?? null,
      type: validated.type,
      status: validated.status,
      price: validated.price,
      sale_price: validated.sale_price ?? null,
      cost: validated.cost ?? null,
      inventory: validated.inventory ?? null,
      sku: validated.sku ?? null,
      featured: validated.featured,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('studio_id', membership.studio_id)

  if (error) {
    console.error('Update product error:', error)
    throw new Error('Failed to update product')
  }

  revalidatePath(`/dashboard/${studioSlug}/store`)
  revalidatePath(`/dashboard/${studioSlug}/store/products/${id}`)
  redirect(`/dashboard/${studioSlug}/store/products/${id}`)
}

export async function deleteProduct(productId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    return { error: 'No active studio membership' }
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('studio_id', membership.studio_id)

  if (error) {
    console.error('Delete product error:', error)
    return { error: 'Failed to delete product' }
  }

  revalidatePath(`/dashboard/${studioSlug}/store`)
}

export async function archiveProducts(productIds: string[], studioSlug: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    return { error: 'No active studio membership' }
  }

  const { error } = await supabase
    .from('products')
    .update({ status: 'archived' })
    .eq('studio_id', membership.studio_id)
    .in('id', productIds)

  if (error) {
    console.error('Archive products error:', error)
    return { error: 'Failed to archive products' }
  }

  revalidatePath(`/dashboard/${studioSlug}/store`)
}

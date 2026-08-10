'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const createStudioSchema = z.object({
  name: z.string().min(2, 'Studio name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2, 'URL must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
})

export async function createStudio(formData: FormData): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const parsed = createStudioSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const validated = parsed.data

  const { data: existing } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', validated.slug)
    .maybeSingle()

  if (existing) {
    return { error: 'That studio URL is already taken' }
  }

  const { data: studio, error: studioError } = await supabase
    .from('studios')
    .insert({
      name: validated.name,
      slug: validated.slug,
      owner_id: user.id,
    })
    .select('id, slug')
    .single()

  if (studioError || !studio) {
    return { error: 'Failed to create studio' }
  }

  const { error: memberError } = await supabase
    .from('studio_members')
    .insert({
      studio_id: studio.id,
      user_id: user.id,
      role: 'studio_owner',
      status: 'active',
      joined_at: new Date().toISOString(),
    })

  if (memberError) {
    return { error: 'Failed to set up studio membership' }
  }

  await supabase
    .from('profiles')
    .update({ studio_id: studio.id, role: 'studio_owner' })
    .eq('id', user.id)

  redirect(`/dashboard/${studio.slug}`)
}

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  if (!/^[a-z0-9-]{2,50}$/.test(slug)) return false

  const supabase = await createClient()
  const { data } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  return !data
}

export async function getStudioForSettings(studioSlug: string): Promise<{ id: string; name: string; ownerId: string } | null> {
  const supabase = await createClient()

  const { data: studio } = await supabase
    .from('studios')
    .select('id, name, owner_id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  return { id: studio.id, name: studio.name, ownerId: studio.owner_id }
}

async function deleteStudioStorageObjects(studioId: string) {
  const supabase = await createClient()
  const bucket = supabase.storage.from('gallery-media')

  const { data: galleryFolders } = await bucket.list(studioId, { limit: 1000 })
  if (!galleryFolders) return

  const pathsToRemove: string[] = []

  for (const folder of galleryFolders) {
    const galleryPath = `${studioId}/${folder.name}`

    const { data: galleryFiles } = await bucket.list(galleryPath, { limit: 1000 })
    for (const item of galleryFiles ?? []) {
      if (item.id) {
        pathsToRemove.push(`${galleryPath}/${item.name}`)
      }
    }

    const { data: thumbFiles } = await bucket.list(`${galleryPath}/thumbs`, { limit: 1000 })
    for (const item of thumbFiles ?? []) {
      pathsToRemove.push(`${galleryPath}/thumbs/${item.name}`)
    }
  }

  if (pathsToRemove.length > 0) {
    await bucket.remove(pathsToRemove)
  }
}

export async function deleteStudio(
  studioSlug: string,
  confirmName: string
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: studio } = await supabase
    .from('studios')
    .select('id, name, owner_id')
    .eq('slug', studioSlug)
    .single()

  if (!studio) {
    return { error: 'Studio not found' }
  }

  if (studio.owner_id !== user.id) {
    return { error: 'Only the studio owner can delete this studio' }
  }

  if (confirmName.trim() !== studio.name.trim()) {
    return { error: 'Studio name does not match' }
  }

  await deleteStudioStorageObjects(studio.id)

  const { error: deleteError } = await supabase
    .from('studios')
    .delete()
    .eq('id', studio.id)

  if (deleteError) {
    console.error('Delete studio error:', deleteError)
    return { error: 'Failed to delete studio' }
  }

  redirect('/dashboard/new')
}

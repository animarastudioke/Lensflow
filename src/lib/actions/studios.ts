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

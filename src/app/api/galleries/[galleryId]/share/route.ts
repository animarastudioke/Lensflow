import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

const shareSettingsSchema = z.object({
  link_name: z.string().max(50).optional(),
  password_protected: z.boolean().default(false),
  password: z.string().optional(),
  expires_at: z.string().optional(),
  allow_download: z.boolean().default(true),
  allow_comments: z.boolean().default(true),
  allow_favorites: z.boolean().default(true),
  require_email: z.boolean().default(false),
  collect_email: z.boolean().default(false),
  custom_branding: z.boolean().default(false),
  brand_name: z.string().max(50).optional(),
  brand_logo: z.string().url().optional().or(z.literal('')),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  cover_image: z.string().url().optional().or(z.literal('')),
  notify_on_view: z.boolean().default(false),
  notify_on_download: z.boolean().default(true),
  notify_on_favorite: z.boolean().default(false),
  notify_on_comment: z.boolean().default(true),
  allow_embed: z.boolean().default(false),
  embed_width: z.number().min(300).max(1920).default(800),
  embed_height: z.number().min(200).max(1080).default(600),
}).refine(data => !data.password_protected || data.password, {
  message: 'Password is required when password protection is enabled',
  path: ['password'],
})

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  try {
    const supabase = await createClient()
    const { galleryId } = await params

    // Parse form data
    const formData = await request.formData()
    const studioSlug = formData.get('studio_slug') as string

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get studio by slug
    const { data: studio } = await supabase
      .from('studios')
      .select('id')
      .eq('slug', studioSlug)
      .single()

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
    }

    // Check permission
    const { data: membership } = await supabase
      .from('studio_members')
      .select('role')
      .eq('studio_id', studio.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['studio_owner', 'photographer'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate form data
    const rawData: Record<string, any> = {}
    formData.forEach((value, key) => {
      if (key !== 'studio_slug') {
        if (value === 'true') rawData[key] = true
        else if (value === 'false') rawData[key] = false
        else if (!isNaN(Number(value)) && value !== '') rawData[key] = Number(value)
        else rawData[key] = value
      }
    })

    const validated = shareSettingsSchema.parse(rawData)

    // Check if gallery belongs to studio
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id')
      .eq('id', galleryId)
      .eq('studio_id', studio.id)
      .single()

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
    }

    // Hash password if provided
    let passwordHash: string | null = null
    if (validated.password_protected && validated.password) {
      passwordHash = await hashPassword(validated.password)
    }

    // Update gallery access settings
    const { error: galleryError } = await supabase
      .from('galleries')
      .update({
        password_protected: validated.password_protected,
        password_hash: passwordHash,
        allow_download: validated.allow_download,
        allow_comments: validated.allow_comments,
        allow_favorites: validated.allow_favorites,
        updated_at: new Date().toISOString(),
      })
      .eq('id', galleryId)
      .eq('studio_id', studio.id)

    if (galleryError) {
      throw galleryError
    }

    // Update share settings
    const { error: settingsError } = await supabase
      .from('gallery_share_settings')
      .upsert({
        gallery_id: galleryId,
        link_name: validated.link_name,
        password_protected: validated.password_protected,
        password_hash: passwordHash,
        expires_at: validated.expires_at || null,
        allow_download: validated.allow_download,
        allow_comments: validated.allow_comments,
        allow_favorites: validated.allow_favorites,
        require_email: validated.require_email,
        collect_email: validated.collect_email,
        custom_branding: validated.custom_branding,
        brand_name: validated.brand_name,
        brand_logo: validated.brand_logo,
        brand_color: validated.brand_color,
        cover_image: validated.cover_image,
        notify_on_view: validated.notify_on_view,
        notify_on_download: validated.notify_on_download,
        notify_on_favorite: validated.notify_on_favorite,
        notify_on_comment: validated.notify_on_comment,
        allow_embed: validated.allow_embed,
        embed_width: validated.embed_width,
        embed_height: validated.embed_height,
      })

    if (settingsError) {
      throw settingsError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update share settings error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update share settings' }, { status: 500 })
  }
}
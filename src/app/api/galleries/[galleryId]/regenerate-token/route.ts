import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

function generateShareToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  try {
    const supabase = await createClient()
    const { galleryId } = await params

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's studio membership
    const { data: membership } = await supabase
      .from('studio_members')
      .select('studio_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['studio_owner', 'photographer'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if gallery belongs to studio
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id')
      .eq('id', galleryId)
      .eq('studio_id', membership.studio_id)
      .single()

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
    }

    // Generate new token
    const newToken = generateShareToken()

    const { error } = await supabase
      .from('galleries')
      .update({ share_token: newToken, updated_at: new Date().toISOString() })
      .eq('id', galleryId)
      .eq('studio_id', membership.studio_id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, newToken })
  } catch (error) {
    console.error('Regenerate token error:', error)
    return NextResponse.json({ error: 'Failed to regenerate token' }, { status: 500 })
  }
}
'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type NotificationType =
  | 'booking_created'
  | 'payment_received'
  | 'invoice_overdue'
  | 'gallery_downloaded'
  | 'gallery_viewed'
  | 'team_invitation'
  | 'order_created'

export interface NotificationRow {
  id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

/**
 * Internal helper called from server actions and webhooks whenever a real
 * event happens — never called speculatively "just in case", so every row
 * this creates corresponds to something that actually occurred. Uses the
 * service-role client because some callers (the M-Pesa webhook) have no
 * authenticated user/session to write through RLS with.
 */
export async function createNotification(
  studioId: string,
  params: { type: NotificationType; title: string; body?: string; link?: string }
): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').insert({
    studio_id: studioId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
  })
  if (error) {
    console.error('Failed to create notification:', error)
  }
}

async function getStudioId(studioSlug: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id').eq('slug', studioSlug).single()
  return studio?.id ?? null
}

export async function getNotifications(
  studioSlug: string,
  options?: { limit?: number }
): Promise<{ notifications: NotificationRow[]; unreadCount: number }> {
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return { notifications: [], unreadCount: 0 }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)

  if (error || !data) return { notifications: [], unreadCount: 0 }

  const notifications = data.map((n) => ({
    id: n.id,
    type: n.type as NotificationType,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.read_at,
    createdAt: n.created_at,
  }))

  return { notifications, unreadCount: notifications.filter((n) => !n.readAt).length }
}

/**
 * Explicit auth + tenant-scoping here rather than leaning solely on RLS
 * (which already independently enforces is_studio_member(studio_id) on this
 * table's UPDATE policy) — defense in depth, and it means a caller can only
 * ever mark read a notification belonging to a studio they're an active
 * member of, resolved from the notification row itself rather than trusted
 * from the studioSlug param.
 */
export async function markNotificationRead(notificationId: string, studioSlug: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: notification } = await supabase
    .from('notifications')
    .select('studio_id')
    .eq('id', notificationId)
    .single()
  if (!notification) return

  const { data: membership } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', notification.studio_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()
  if (!membership) return

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('studio_id', notification.studio_id)
    .is('read_at', null)
  revalidatePath(`/dashboard/${studioSlug}`)
}

export async function markAllNotificationsRead(studioSlug: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const studioId = await getStudioId(studioSlug)
  if (!studioId) return

  const { data: membership } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()
  if (!membership) return

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('studio_id', studioId)
    .is('read_at', null)
  revalidatePath(`/dashboard/${studioSlug}`)
}

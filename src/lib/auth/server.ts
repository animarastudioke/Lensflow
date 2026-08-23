import { createClient } from '@/lib/supabase/server'
import { UserRole, Permission, hasPermission } from './permissions'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: UserRole
  studioId?: string
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, avatar_url, role, studio_id')
    .eq('id', session.user.id)
    .single()

  if (profile) {
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile['first_name'],
      lastName: profile['last_name'],
      avatarUrl: profile['avatar_url'],
      role: profile['role'] as UserRole,
      studioId: profile.studio_id,
    }
  }

  // Fallback to auth metadata
  return {
    id: session.user.id,
    email: session.user.email!,
    firstName: session.user.user_metadata?.['first_name'] || 'User',
    lastName: session.user.user_metadata?.['last_name'] || '',
    avatarUrl: session.user.user_metadata?.['avatar_url'],
    role: (session.user.user_metadata?.['role'] as UserRole) || 'client',
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthUser> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions')
  }
  return user
}

export async function requirePermission(
  permission: string
): Promise<AuthUser> {
  const user = await requireAuth()
  const { hasPermission } = await import('./permissions')
  if (!hasPermission(user.role, permission as any)) {
    throw new Error('Insufficient permissions')
  }
  return user
}

export async function getStudioId(): Promise<string | null> {
  const user = await getAuthUser()
  return user?.studioId ?? null
}

/**
 * Studio-scoped permission check for financial/store Server Actions
 * (invoices, quotes, orders, products). Uses the caller's *studio_members*
 * role for the studio they're actually acting in — not profiles.role, which
 * is a single global field and can't express "manager in studio A,
 * read-only in studio B" — checked against the same ROLE_PERMISSIONS matrix
 * used everywhere else (src/lib/auth/permissions.ts). Merely having an
 * active membership is not sufficient: a team_member/editor/client role has
 * an active membership but few or no financial permissions.
 */
export async function requireStudioPermission(
  permission: Permission
): Promise<{ error: string } | { userId: string; studioId: string; role: UserRole }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return { error: 'No active studio membership' }

  const role = membership.role as UserRole
  if (!hasPermission(role, permission)) {
    return { error: 'You do not have permission to perform this action' }
  }

  return { userId: user.id, studioId: membership.studio_id, role }
}

export async function getUserStudiios(): Promise<string[]> {
  const user = await getAuthUser()
  if (!user) return []

  const supabase = await createClient()

  const { data: memberships } = await supabase
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  return memberships?.map((m: { studio_id: string }) => m.studio_id) ?? []
}
'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { canAddTeamSeat } from '@/lib/entitlements'
import { createNotification } from '@/lib/actions/notifications'
import { canManageRole } from '@/lib/auth/permissions'
import { APP_CONSTANTS } from '@/lib/constants'

// Real assignable roles for a studio's team, matching the user_role enum and
// the permission map already enforced in checkGalleryPermission
// (src/lib/actions/galleries.ts). "studio_owner" isn't offered on the invite
// form — ownership is set at studio creation, not by invite.
export type TeamRole = 'photographer' | 'team_member' | 'editor'
export type TeamMemberStatus = 'active' | 'invited' | 'suspended'

export interface TeamMemberRow {
  id: string
  userId: string
  role: 'studio_owner' | TeamRole
  status: TeamMemberStatus
  invitedAt: string
  joinedAt: string | null
  isOwner: boolean
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
}

async function requireManager(studioSlug: string): Promise<
  { error: string } | { userId: string; studioId: string; role: 'studio_owner' | 'photographer' }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: studio } = await supabase.from('studios').select('id, owner_id').eq('slug', studioSlug).single()
  if (!studio) return { error: 'Studio not found' }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('role, status')
    .eq('studio_id', studio.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const isManager = membership && ['studio_owner', 'photographer'].includes(membership.role)
  if (!isManager) return { error: 'Only studio owners and photographers can manage the team' }

  return { userId: user.id, studioId: studio.id, role: membership.role as 'studio_owner' | 'photographer' }
}

export async function getTeamMembers(studioSlug: string): Promise<TeamMemberRow[]> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id, owner_id').eq('slug', studioSlug).single()
  if (!studio) return []

  const { data: members } = await supabase
    .from('studio_members')
    .select('id, user_id, role, status, invited_at, joined_at')
    .eq('studio_id', studio.id)
    .order('invited_at', { ascending: true })

  if (!members || members.length === 0) return []

  const userIds = members.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url')
    .in('id', userIds)

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  return members.map((m) => {
    const profile = profileById.get(m.user_id)
    return {
      id: m.id,
      userId: m.user_id,
      role: m.role as TeamMemberRow['role'],
      status: m.status as TeamMemberStatus,
      invitedAt: m.invited_at,
      joinedAt: m.joined_at,
      isOwner: m.user_id === studio.owner_id,
      firstName: profile?.first_name ?? '',
      lastName: profile?.last_name ?? '',
      email: profile?.email ?? '(unknown)',
      avatarUrl: profile?.avatar_url ?? null,
    }
  })
}

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['photographer', 'team_member', 'editor']),
})

export async function inviteTeamMember(
  studioSlug: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const manager = await requireManager(studioSlug)
  if ('error' in manager) return manager

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  })
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  const { email, role } = parsed.data

  const seatCheck = await canAddTeamSeat(manager.studioId)
  if (!seatCheck.allowed) return { error: seatCheck.reason }

  const supabase = await createClient()

  // Already on this studio's team?
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    const { data: existingMembership } = await supabase
      .from('studio_members')
      .select('id')
      .eq('studio_id', manager.studioId)
      .eq('user_id', existingProfile.id)
      .maybeSingle()
    if (existingMembership) return { error: 'This person is already on the team' }
  }

  let invitedUserId: string

  if (existingProfile) {
    // Person already has a LensFlow account (owns their own studio, or is on
    // another team) — link them to this studio rather than re-inviting.
    invitedUserId = existingProfile.id
  } else {
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${APP_CONSTANTS.URL}/auth/callback`,
    })
    if (inviteError || !inviteData.user) {
      console.error('Supabase invite error:', inviteError)
      return { error: inviteError?.message ?? 'Failed to send invitation' }
    }
    invitedUserId = inviteData.user.id
    // handle_new_user() defaults every new signup's profile role to
    // 'studio_owner' (correct for normal self-signup) — override it to the
    // role actually assigned for this invite.
    await supabaseAdmin.from('profiles').update({ role, studio_id: manager.studioId }).eq('id', invitedUserId)
  }

  const { error: memberError } = await supabase.from('studio_members').insert({
    studio_id: manager.studioId,
    user_id: invitedUserId,
    role,
    status: 'invited',
  })

  if (memberError) {
    console.error('Failed to create studio_members row:', memberError)
    return { error: 'Invitation sent, but failed to record team membership — contact support.' }
  }

  await createNotification(manager.studioId, {
    type: 'team_invitation',
    title: 'Team invitation sent',
    body: `Invited ${email} as ${role.replace('_', ' ')}`,
  })

  revalidatePath(`/dashboard/${studioSlug}/team`)
  return { success: true }
}

export async function resendTeamInvite(
  memberId: string,
  studioSlug: string
): Promise<{ error: string } | { success: true }> {
  const manager = await requireManager(studioSlug)
  if ('error' in manager) return manager

  const supabase = await createClient()
  const { data: member } = await supabase
    .from('studio_members')
    .select('user_id, status')
    .eq('id', memberId)
    .eq('studio_id', manager.studioId)
    .single()

  if (!member) return { error: 'Team member not found' }
  if (member.status !== 'invited') return { error: 'This person has already joined' }

  const { data: profile } = await supabase.from('profiles').select('email').eq('id', member.user_id).single()
  if (!profile) return { error: 'Could not find their account' }

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(profile.email, {
    redirectTo: `${APP_CONSTANTS.URL}/auth/callback`,
  })
  if (error) {
    console.error('Resend invite error:', error)
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${studioSlug}/team`)
  return { success: true }
}

const teamRoleSchema = z.enum(['photographer', 'team_member', 'editor'])

export async function updateTeamMemberRole(
  memberId: string,
  role: TeamRole,
  studioSlug: string
): Promise<{ error: string } | { success: true }> {
  const manager = await requireManager(studioSlug)
  if ('error' in manager) return manager

  // role arrives as a Server Action argument, not validated by TypeScript
  // at runtime -- a caller bypassing the UI could pass any string,
  // including 'studio_owner'. Reject anything outside the three roles
  // actually assignable via team management (studio_owner is never
  // offered on the invite form either -- see the TeamRole comment above).
  const parsedRole = teamRoleSchema.safeParse(role)
  if (!parsedRole.success) return { error: 'Invalid role' }

  // Existing role hierarchy (src/lib/auth/permissions.ts) -- a manager can
  // only assign a role strictly below their own. This stops a
  // photographer-manager from unilaterally creating peer managers
  // (assigning 'photographer') without the owner's involvement, while
  // still letting them assign 'team_member'/'editor' as before.
  if (!canManageRole(manager.role, parsedRole.data)) {
    return { error: 'You do not have permission to assign this role' }
  }

  const supabase = await createClient()

  const { data: target } = await supabase
    .from('studio_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('studio_id', manager.studioId)
    .single()

  if (!target) return { error: 'Team member not found' }
  if (target.role === 'studio_owner') return { error: 'The studio owner\'s role cannot be changed' }
  if (target.user_id === manager.userId) return { error: 'You cannot change your own role' }

  const { error } = await supabase
    .from('studio_members')
    .update({ role: parsedRole.data, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('studio_id', manager.studioId)
    .neq('role', 'studio_owner')

  if (error) return { error: 'Failed to update role' }
  revalidatePath(`/dashboard/${studioSlug}/team`)
  return { success: true }
}

export async function updateTeamMemberStatus(
  memberId: string,
  status: 'active' | 'suspended',
  studioSlug: string
): Promise<{ error: string } | { success: true }> {
  const manager = await requireManager(studioSlug)
  if ('error' in manager) return manager

  const supabase = await createClient()
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'active') update['joined_at'] = new Date().toISOString()

  const { error } = await supabase
    .from('studio_members')
    .update(update)
    .eq('id', memberId)
    .eq('studio_id', manager.studioId)
    .neq('role', 'studio_owner')

  if (error) return { error: 'Failed to update status' }
  revalidatePath(`/dashboard/${studioSlug}/team`)
  return { success: true }
}

export async function removeTeamMember(
  memberId: string,
  studioSlug: string
): Promise<{ error: string } | { success: true }> {
  const manager = await requireManager(studioSlug)
  if ('error' in manager) return manager

  const supabase = await createClient()
  const { error } = await supabase
    .from('studio_members')
    .delete()
    .eq('id', memberId)
    .eq('studio_id', manager.studioId)
    .neq('role', 'studio_owner')

  if (error) return { error: 'Failed to remove team member' }
  revalidatePath(`/dashboard/${studioSlug}/team`)
  return { success: true }
}

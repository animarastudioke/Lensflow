import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 10 Target 6 regression coverage: updateTeamMemberRole() previously
// accepted its `role` argument with no runtime validation (TypeScript-only
// typing -- no protection against a caller bypassing the UI) and enforced
// no role hierarchy at all beyond "caller is some manager" -- a
// photographer-manager could unilaterally promote a teammate to
// 'photographer' (a peer manager role) or, absent the DB's own WITH CHECK
// backstop, attempt 'studio_owner'. This file proves the new runtime zod
// validation and the (pre-existing, previously-unused) canManageRole()
// role-hierarchy check now gate every mutation, using the REAL
// canManageRole()/ROLE_HIERARCHY from src/lib/auth/permissions.ts -- only
// the Supabase client is mocked, never the hierarchy logic itself.

let studioMembersCallCount = 0
let studioLookupResult: unknown = { id: 'studio-1', owner_id: 'owner-user-id' }
let callerMembershipResult: unknown = { role: 'studio_owner', status: 'active' }
let targetMembershipResult: unknown = { user_id: 'target-user-id', role: 'team_member' }
let updateError: unknown = null
const dbCalls: { table: string; op: string; payload?: unknown }[] = []

function makeBuilder(singleResult: unknown, opName?: string, payload?: unknown): any {
  const builder: any = {}
  for (const method of ['select', 'eq', 'neq']) {
    builder[method] = (..._args: unknown[]) => builder
  }
  builder.update = (data: unknown) => {
    dbCalls.push({ table: 'studio_members', op: 'update', payload: data })
    return {
      eq: () => ({ eq: () => ({ neq: async () => ({ error: updateError }) }) }),
    }
  }
  builder.single = async () => ({ data: singleResult, error: null })
  void opName
  void payload
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'caller-user-id' } } }) },
    from: (table: string) => {
      if (table === 'studios') return makeBuilder(studioLookupResult)
      if (table === 'studio_members') {
        studioMembersCallCount++
        // First call within a single action = requireManager() resolving
        // the CALLER's own membership row; second = the TARGET member's
        // row, looked up directly in updateTeamMemberRole().
        return makeBuilder(studioMembersCallCount % 2 === 1 ? callerMembershipResult : targetMembershipResult)
      }
      return makeBuilder(null)
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { auth: { admin: { inviteUserByEmail: vi.fn() } } } }))
vi.mock('@/lib/entitlements', () => ({ canAddTeamSeat: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/actions/notifications', () => ({ createNotification: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { updateTeamMemberRole } = await import('@/lib/actions/team')

beforeEach(() => {
  studioMembersCallCount = 0
  dbCalls.length = 0
  updateError = null
  studioLookupResult = { id: 'studio-1', owner_id: 'owner-user-id' }
  callerMembershipResult = { role: 'studio_owner', status: 'active' }
  targetMembershipResult = { user_id: 'target-user-id', role: 'team_member' }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Phase 10 Target 6: updateTeamMemberRole runtime validation', () => {
  it('rejects an invalid role value not in the assignable set', async () => {
    callerMembershipResult = { role: 'studio_owner', status: 'active' }
    // @ts-expect-error -- deliberately passing a value outside TeamRole to
    // prove runtime validation catches what TypeScript alone would not
    // stop a non-browser caller from sending.
    const result = await updateTeamMemberRole('member-1', 'studio_owner', 'studio-slug')
    expect(result).toEqual({ error: 'Invalid role' })
    expect(dbCalls).toHaveLength(0)
  })

  it('rejects a nonsense role string', async () => {
    callerMembershipResult = { role: 'studio_owner', status: 'active' }
    // @ts-expect-error -- same as above, a value TeamRole cannot express
    const result = await updateTeamMemberRole('member-1', 'super_admin', 'studio-slug')
    expect(result).toEqual({ error: 'Invalid role' })
    expect(dbCalls).toHaveLength(0)
  })
})

describe('Phase 10 Target 6: role hierarchy enforcement (real canManageRole)', () => {
  it('studio_owner can promote a team_member to photographer', async () => {
    callerMembershipResult = { role: 'studio_owner', status: 'active' }
    targetMembershipResult = { user_id: 'target-user-id', role: 'team_member' }
    const result = await updateTeamMemberRole('member-1', 'photographer', 'studio-slug')
    expect(result).toEqual({ success: true })
    expect(dbCalls).toContainEqual(expect.objectContaining({ op: 'update', payload: expect.objectContaining({ role: 'photographer' }) }))
  })

  it('photographer manager CANNOT promote a teammate to photographer (peer-manager creation blocked)', async () => {
    callerMembershipResult = { role: 'photographer', status: 'active' }
    targetMembershipResult = { user_id: 'target-user-id', role: 'team_member' }
    const result = await updateTeamMemberRole('member-1', 'photographer', 'studio-slug')
    expect(result).toEqual({ error: 'You do not have permission to assign this role' })
    expect(dbCalls).toHaveLength(0)
  })

  it('photographer manager CAN demote/assign team_member', async () => {
    callerMembershipResult = { role: 'photographer', status: 'active' }
    targetMembershipResult = { user_id: 'target-user-id', role: 'editor' }
    const result = await updateTeamMemberRole('member-1', 'team_member', 'studio-slug')
    expect(result).toEqual({ success: true })
  })

  it('photographer manager CAN assign editor', async () => {
    callerMembershipResult = { role: 'photographer', status: 'active' }
    targetMembershipResult = { user_id: 'target-user-id', role: 'team_member' }
    const result = await updateTeamMemberRole('member-1', 'editor', 'studio-slug')
    expect(result).toEqual({ success: true })
  })
})

describe('Phase 10 Target 6: self-promotion and target validation', () => {
  it('a manager cannot change their own role', async () => {
    callerMembershipResult = { role: 'photographer', status: 'active' }
    targetMembershipResult = { user_id: 'caller-user-id', role: 'photographer' }
    const result = await updateTeamMemberRole('member-1', 'team_member', 'studio-slug')
    expect(result).toEqual({ error: 'You cannot change your own role' })
    expect(dbCalls).toHaveLength(0)
  })

  it('nonexistent target member is rejected', async () => {
    callerMembershipResult = { role: 'studio_owner', status: 'active' }
    targetMembershipResult = null
    const result = await updateTeamMemberRole('nonexistent-member', 'team_member', 'studio-slug')
    expect(result).toEqual({ error: 'Team member not found' })
    expect(dbCalls).toHaveLength(0)
  })

  it("the studio owner's own row cannot be targeted for a role change", async () => {
    callerMembershipResult = { role: 'studio_owner', status: 'active' }
    targetMembershipResult = { user_id: 'owner-user-id', role: 'studio_owner' }
    const result = await updateTeamMemberRole('owner-member-row', 'team_member', 'studio-slug')
    expect(result).toEqual({ error: "The studio owner's role cannot be changed" })
    expect(dbCalls).toHaveLength(0)
  })

  it('same-role update is allowed as a harmless no-op', async () => {
    callerMembershipResult = { role: 'studio_owner', status: 'active' }
    targetMembershipResult = { user_id: 'target-user-id', role: 'team_member' }
    const result = await updateTeamMemberRole('member-1', 'team_member', 'studio-slug')
    expect(result).toEqual({ success: true })
  })
})

describe('Phase 10 Target 6: unauthorized caller', () => {
  it('a non-manager (team_member/editor) cannot call updateTeamMemberRole at all', async () => {
    callerMembershipResult = { role: 'team_member', status: 'active' }
    const result = await updateTeamMemberRole('member-1', 'editor', 'studio-slug')
    expect(result).toEqual({ error: 'Only studio owners and photographers can manage the team' })
    expect(dbCalls).toHaveLength(0)
  })
})

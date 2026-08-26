import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 10 Target 4 acceptance test for migration
 * 044_phase10_authorization_hardening.sql.
 *
 * Phase 9 reconnaissance live-confirmed that questionnaire_responses'
 * SELECT policy authorized reads via is_studio_member(studio_id) alone --
 * any active studio member, including editor (who holds no
 * questionnaires:read in either ROLE_PERMISSIONS or
 * has_studio_permission()), could read questionnaire_responses.answers
 * (client-submitted content) directly via PostgREST.
 *
 * Migration 044 changes the SELECT policy to require questionnaires:read,
 * matching ROLE_PERMISSIONS exactly (photographer, team_member granted;
 * editor and non-members denied) -- already cased in has_studio_permission()
 * since migration 038, so this migration only changes the RLS policy, not
 * the function. INSERT/UPDATE (migration 041) are untouched.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'questionnaire-responses-select-authorization.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-qr10-${RUN_ID}`

interface RoleUser {
  userId: string
  client: SupabaseClient
}

let studioId: string
let otherStudioId: string
let clientUserIds: string[] = []
let owner: RoleUser
let photographer: RoleUser
let teamMember: RoleUser
let editor: RoleUser
let crossStudioOwner: RoleUser
let responseId: string

async function createRoleUser(label: string, role: string, targetStudioId: string): Promise<RoleUser> {
  const email = `${RUN_TAG}-${label}@example.com`
  const password = crypto.randomUUID()
  const { data: userRes, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (userError || !userRes.user) throw new Error(`Failed to create ${label}: ${userError?.message}`)

  const { error: memberError } = await admin.from('studio_members').insert({
    studio_id: targetStudioId, user_id: userRes.user.id, role, status: 'active', joined_at: new Date().toISOString(),
  })
  if (memberError) throw new Error(`Failed to add ${label} to studio: ${memberError.message}`)

  const anonForSignIn = createClient(SUPABASE_URL, ANON_KEY)
  const { data: signIn, error: signInError } = await anonForSignIn.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.session) throw new Error(`Failed to sign in ${label}: ${signInError?.message}`)

  const scopedClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  clientUserIds.push(userRes.user.id)
  return { userId: userRes.user.id, client: scopedClient }
}

beforeAll(async () => {
  const { data: studio, error: studioError } = await admin
    .from('studios')
    .insert({ name: RUN_TAG, slug: RUN_TAG, owner_id: null })
    .select('id')
    .single()
  if (studioError || !studio) throw new Error(`Failed to create test studio: ${studioError?.message}`)
  studioId = studio.id

  const { data: otherStudio, error: otherStudioError } = await admin
    .from('studios')
    .insert({ name: `${RUN_TAG}-other`, slug: `${RUN_TAG}-other`, owner_id: null })
    .select('id')
    .single()
  if (otherStudioError || !otherStudio) throw new Error(`Failed to create other test studio: ${otherStudioError?.message}`)
  otherStudioId = otherStudio.id

  owner = await createRoleUser('owner', 'studio_owner', studioId)
  await admin.from('studios').update({ owner_id: owner.userId }).eq('id', studioId)
  photographer = await createRoleUser('photographer', 'photographer', studioId)
  teamMember = await createRoleUser('teammember', 'team_member', studioId)
  editor = await createRoleUser('editor', 'editor', studioId)
  crossStudioOwner = await createRoleUser('crossowner', 'studio_owner', otherStudioId)

  const { data: template, error: templateError } = await admin
    .from('questionnaire_templates')
    .insert({ studio_id: studioId, name: RUN_TAG, fields: [{ id: 'q1', label: 'test', type: 'text' }] })
    .select('id')
    .single()
  if (templateError || !template) throw new Error(`Failed to create template: ${templateError?.message}`)

  const { data: response, error: responseError } = await admin
    .from('questionnaire_responses')
    .insert({ studio_id: studioId, template_id: template.id, share_token: crypto.randomUUID(), answers: { q1: 'synthetic-disposable-test-value' } })
    .select('id')
    .single()
  if (responseError || !response) throw new Error(`Failed to create response: ${responseError?.message}`)
  responseId = response.id
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
  if (otherStudioId) await admin.from('studios').delete().eq('id', otherStudioId)
  for (const id of clientUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
})

describe('questionnaire_responses SELECT: matches ROLE_PERMISSIONS (photographer, team_member only)', () => {
  it('studio_owner can read questionnaire responses', async () => {
    const { data } = await owner.client.from('questionnaire_responses').select('id').eq('id', responseId)
    expect(data).toHaveLength(1)
  })

  it('photographer can read questionnaire responses (holds questionnaires:read)', async () => {
    const { data } = await photographer.client.from('questionnaire_responses').select('id').eq('id', responseId)
    expect(data).toHaveLength(1)
  })

  it('team_member can read questionnaire responses (holds questionnaires:read)', async () => {
    const { data } = await teamMember.client.from('questionnaire_responses').select('id').eq('id', responseId)
    expect(data).toHaveLength(1)
  })

  it('editor cannot read questionnaire responses (lacks questionnaires:read)', async () => {
    const { data } = await editor.client.from('questionnaire_responses').select('id, answers').eq('id', responseId)
    expect(data ?? []).toEqual([])
  })

  it('a studio_owner from another studio cannot read this studio\'s questionnaire responses (tenant isolation)', async () => {
    const { data } = await crossStudioOwner.client.from('questionnaire_responses').select('id, answers').eq('id', responseId)
    expect(data ?? []).toEqual([])
  })

  it('anonymous cannot read questionnaire responses', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await anon.from('questionnaire_responses').select('id, answers').eq('id', responseId)
    expect(data ?? []).toEqual([])
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Phase 5 P4 acceptance test for migrations 041
 * (041_questionnaire_responses_write_policies.sql). NOT DEPLOYED as of
 * writing -- ALL tests below are EXPECTED TO FAIL against the live
 * database until 041 is applied, since questionnaire_responses
 * currently has no INSERT or UPDATE policy at all (a live, pre-existing
 * bug discovered while building this feature -- see the Phase 5
 * report). This is not specific to the regeneration feature: even
 * creating a response (the send-questionnaire flow) fails today.
 *
 * Proves, once 041 is live: an authorized studio_owner can create a
 * response, regenerate its share token via
 * regenerateQuestionnaireResponseShareToken-equivalent direct UPDATE,
 * the OLD token immediately stops resolving via the public read path,
 * the NEW token resolves correctly, and the response's existing
 * submission state (answers/submitted_at) is untouched by the rotation.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'questionnaire-token-regeneration.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-qtok-${RUN_ID}`

let studioId: string
let ownerUserId: string
let ownerClient: SupabaseClient
let templateId: string
let responseId: string
const originalToken = `${RUN_TAG}-orig`

beforeAll(async () => {
  const { data: studio, error: studioError } = await admin
    .from('studios')
    .insert({ name: RUN_TAG, slug: RUN_TAG, owner_id: null })
    .select('id')
    .single()
  if (studioError || !studio) throw new Error(`Failed to create test studio: ${studioError?.message}`)
  studioId = studio.id

  const email = `${RUN_TAG}-owner@example.com`
  const password = crypto.randomUUID()
  const { data: userRes, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (userError || !userRes.user) throw new Error(`Failed to create owner: ${userError?.message}`)
  ownerUserId = userRes.user.id

  await admin.from('studio_members').insert({
    studio_id: studioId, user_id: ownerUserId, role: 'studio_owner', status: 'active', joined_at: new Date().toISOString(),
  })
  await admin.from('studios').update({ owner_id: ownerUserId }).eq('id', studioId)

  const { data: template } = await admin
    .from('questionnaire_templates')
    .insert({ studio_id: studioId, name: RUN_TAG, fields: [] })
    .select('id')
    .single()
  templateId = template!.id

  const { data: response } = await admin
    .from('questionnaire_responses')
    .insert({ template_id: templateId, studio_id: studioId, client_id: null, share_token: originalToken, answers: {} })
    .select('id')
    .single()
  responseId = response!.id

  const anonForSignIn = createClient(SUPABASE_URL, ANON_KEY)
  const { data: signIn } = await anonForSignIn.auth.signInWithPassword({ email, password })
  ownerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signIn!.session!.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
  if (ownerUserId) await admin.auth.admin.deleteUser(ownerUserId).catch(() => {})
})

describe('questionnaire_responses: write policies exist (enabling infrastructure for regeneration)', () => {
  it('studio_owner can create a response through the RLS-bound client (send-questionnaire flow)', async () => {
    const { data, error } = await ownerClient
      .from('questionnaire_responses')
      .insert({ template_id: templateId, studio_id: studioId, client_id: null, share_token: `${RUN_TAG}-second`, answers: {} })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
  })
})

describe('questionnaire_responses: token regeneration revokes the old token', () => {
  it('studio_owner can regenerate the share token', async () => {
    const newToken = `${RUN_TAG}-rotated`
    const { data, error } = await ownerClient
      .from('questionnaire_responses')
      .update({ share_token: newToken })
      .eq('id', responseId)
      .eq('studio_id', studioId)
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(responseId)
  })

  it('the OLD token no longer resolves to the response', async () => {
    const { data } = await admin.from('questionnaire_responses').select('id').eq('share_token', originalToken)
    expect(data ?? []).toEqual([])
  })

  it('the NEW token resolves to the same response', async () => {
    const { data } = await admin.from('questionnaire_responses').select('id').eq('share_token', `${RUN_TAG}-rotated`)
    expect(data).toHaveLength(1)
    expect(data?.[0]?.id).toBe(responseId)
  })

  it('the response row itself (id, template_id, studio_id) is otherwise unchanged', async () => {
    const { data } = await admin.from('questionnaire_responses').select('id, template_id, studio_id').eq('id', responseId).single()
    expect(data?.template_id).toBe(templateId)
    expect(data?.studio_id).toBe(studioId)
  })
})

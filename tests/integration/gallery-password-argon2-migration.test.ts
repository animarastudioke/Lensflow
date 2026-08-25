import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { verifyGalleryPassword } from '@/lib/actions/galleries'

/**
 * Phase 6 live proof: gallery password hashing has migrated from unsalted
 * SHA-256 to Argon2id, with transparent lazy rehash on successful legacy
 * verification.
 *
 * Calls the REAL verifyGalleryPassword Server Action (not a reimplementation
 * of its logic) against disposable galleries in the real Supabase project,
 * then reads the raw password_hash column back with the admin client to
 * prove what actually got written (or didn't).
 *
 * "Legacy" galleries are simulated by inserting a plain SHA-256 hex digest
 * directly into password_hash via the admin client — reproducing exactly
 * what every gallery's password_hash looked like before this phase, since
 * production currently has zero password-protected galleries to migrate
 * from live (confirmed during Phase 6 reconnaissance).
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'gallery-password-argon2-migration.test.ts requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see .env.local).'
  )
}

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-gpw-${RUN_ID}`

function legacySha256(password: string): string {
  return createHash('sha256').update(password, 'utf8').digest('hex')
}

interface TestGallery {
  id: string
  shareToken: string
}

let studioAId: string
let studioBId: string
const galleryIds: string[] = []

async function makeStudio(label: string): Promise<string> {
  const { data, error } = await admin
    .from('studios')
    .insert({ name: `${RUN_TAG}-${label}`, slug: `${RUN_TAG}-${label}`, owner_id: null })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create studio ${label}: ${error?.message}`)
  return data.id
}

async function makeGallery(studioId: string, label: string, passwordHash: string): Promise<TestGallery> {
  const shareToken = `${RUN_TAG}-${label}-token`
  const { data, error } = await admin
    .from('galleries')
    .insert({
      studio_id: studioId,
      name: `${RUN_TAG}-${label}`,
      status: 'published',
      password_protected: true,
      password_hash: passwordHash,
      share_token: shareToken,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create gallery ${label}: ${error?.message}`)
  galleryIds.push(data.id)
  return { id: data.id, shareToken }
}

async function readHash(galleryId: string): Promise<string | null> {
  const { data, error } = await admin.from('galleries').select('password_hash').eq('id', galleryId).single()
  if (error || !data) throw new Error(`Failed to read gallery ${galleryId}: ${error?.message}`)
  return data.password_hash
}

beforeAll(async () => {
  studioAId = await makeStudio('studio-a')
  studioBId = await makeStudio('studio-b')
})

afterAll(async () => {
  if (studioAId) await admin.from('studios').delete().eq('id', studioAId)
  if (studioBId) await admin.from('studios').delete().eq('id', studioBId)

  // Verify cleanup actually happened, not just that the delete calls didn't error.
  const { data: leftoverStudios } = await admin.from('studios').select('id').like('slug', `${RUN_TAG}%`)
  expect(leftoverStudios ?? []).toEqual([])
  const { data: leftoverGalleries } = await admin.from('galleries').select('id').in('id', galleryIds)
  expect(leftoverGalleries ?? []).toEqual([])
})

describe('legacy SHA-256 gallery: correct password verifies AND transparently upgrades the hash', () => {
  it('full lifecycle: legacy hash -> verify success -> hash becomes Argon2id -> password still works', async () => {
    const password = 'legacy-correct-password'
    const gallery = await makeGallery(studioAId, 'legacy-upgrade', legacySha256(password))

    const before = await readHash(gallery.id)
    expect(before).not.toBeNull()
    expect(before!.startsWith('$argon2')).toBe(false)

    const firstVerify = await verifyGalleryPassword(gallery.shareToken, password)
    expect(firstVerify).toBe(true)

    const after = await readHash(gallery.id)
    expect(after).not.toBeNull()
    expect(after!.startsWith('$argon2id$')).toBe(true)
    expect(after).not.toBe(before)

    // The upgraded hash must still authenticate the same password going forward.
    const secondVerify = await verifyGalleryPassword(gallery.shareToken, password)
    expect(secondVerify).toBe(true)

    // Verifying again with an already-Argon2id hash must not rewrite it further.
    const afterSecondVerify = await readHash(gallery.id)
    expect(afterSecondVerify).toBe(after)
  })
})

describe('legacy SHA-256 gallery: wrong password never rehashes', () => {
  it('verify fails and password_hash is byte-for-byte unchanged', async () => {
    const password = 'legacy-wrong-password-test'
    const legacyHash = legacySha256(password)
    const gallery = await makeGallery(studioAId, 'legacy-wrong', legacyHash)

    const result = await verifyGalleryPassword(gallery.shareToken, 'incorrect-guess')
    expect(result).toBe(false)

    const stillHash = await readHash(gallery.id)
    expect(stillHash).toBe(legacyHash)
  })
})

describe('new Argon2id gallery: works end to end without ever touching legacy logic', () => {
  it('correct password verifies true, wrong password verifies false, hash never changes', async () => {
    // Simulates createGallery's own hashGalleryPassword call by hashing
    // through the same shared module the app uses.
    const { hashGalleryPassword } = await import('@/lib/security/gallery-password')
    const password = 'brand-new-argon2-password'
    const hash = await hashGalleryPassword(password)
    const gallery = await makeGallery(studioAId, 'new-argon2', hash)

    expect(await verifyGalleryPassword(gallery.shareToken, password)).toBe(true)
    expect(await verifyGalleryPassword(gallery.shareToken, 'wrong')).toBe(false)

    const finalHash = await readHash(gallery.id)
    expect(finalHash).toBe(hash)
  })
})

describe('cross-studio / cross-gallery isolation of the verify-and-rehash path', () => {
  it('verifying studio A\'s gallery never touches studio B\'s gallery row, even with an identical password', async () => {
    const sharedPassword = 'same-password-both-studios'
    const galleryA = await makeGallery(studioAId, 'isolation-a', legacySha256(sharedPassword))
    const galleryB = await makeGallery(studioBId, 'isolation-b', legacySha256(sharedPassword))

    const beforeBHash = await readHash(galleryB.id)

    const result = await verifyGalleryPassword(galleryA.shareToken, sharedPassword)
    expect(result).toBe(true)

    const afterAHash = await readHash(galleryA.id)
    const afterBHash = await readHash(galleryB.id)

    expect(afterAHash!.startsWith('$argon2id$')).toBe(true) // A upgraded
    expect(afterBHash).toBe(beforeBHash) // B completely untouched
    expect(afterBHash!.startsWith('$argon2')).toBe(false) // B still legacy
  })
})

describe('non-password-protected gallery: verification is a no-op regardless of format', () => {
  it('returns true for any password and never writes password_hash', async () => {
    const shareToken = `${RUN_TAG}-unprotected-token`
    const { data, error } = await admin
      .from('galleries')
      .insert({
        studio_id: studioAId,
        name: `${RUN_TAG}-unprotected`,
        status: 'published',
        password_protected: false,
        password_hash: null,
        share_token: shareToken,
      })
      .select('id')
      .single()
    if (error || !data) throw new Error(`Failed to create unprotected gallery: ${error?.message}`)
    galleryIds.push(data.id)

    expect(await verifyGalleryPassword(shareToken, 'literally anything')).toBe(true)
    expect(await verifyGalleryPassword(shareToken, '')).toBe(true)

    const hash = await readHash(data.id)
    expect(hash).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { hashGalleryPassword, isArgon2Hash, verifyGalleryPasswordHash } from '@/lib/security/gallery-password'
import { createHash } from 'node:crypto'

/**
 * Unit coverage for the Argon2id gallery-password module (Phase 6). Uses the
 * real @node-rs/argon2 binding — not mocked — since the whole point is to
 * prove the actual hash format and verify() behavior, not a stand-in for it.
 * Legacy SHA-256 hashes are reproduced here with Node's own `crypto` module
 * (not the app's old crypto.subtle implementation, which no longer exists in
 * galleries.ts) — both are plain unsalted SHA-256 hex digests, so they
 * produce byte-identical output for the same input.
 */

function legacySha256(password: string): string {
  return createHash('sha256').update(password, 'utf8').digest('hex')
}

describe('hashGalleryPassword', () => {
  it('produces a self-describing $argon2id$ PHC-format hash', async () => {
    const hash = await hashGalleryPassword('correct horse battery staple')
    expect(hash.startsWith('$argon2id$')).toBe(true)
  })

  it('never produces a hash that looks like the legacy 64-hex-char SHA-256 format', async () => {
    const hash = await hashGalleryPassword('anypassword')
    expect(/^[0-9a-f]{64}$/i.test(hash)).toBe(false)
  })

  it('produces a different hash each time for the same password (salted)', async () => {
    const [a, b] = await Promise.all([hashGalleryPassword('samepassword'), hashGalleryPassword('samepassword')])
    expect(a).not.toBe(b)
  })
})

describe('isArgon2Hash', () => {
  it('true for a real argon2id hash', async () => {
    expect(isArgon2Hash(await hashGalleryPassword('x'))).toBe(true)
  })

  it('false for a legacy SHA-256 hex digest', () => {
    expect(isArgon2Hash(legacySha256('x'))).toBe(false)
  })

  it('false for an empty string or garbage value', () => {
    expect(isArgon2Hash('')).toBe(false)
    expect(isArgon2Hash('not-a-hash')).toBe(false)
  })
})

describe('verifyGalleryPasswordHash: Argon2id hashes', () => {
  it('valid=true, needsRehash=false for the correct password against its own argon2id hash', async () => {
    const hash = await hashGalleryPassword('studio-secret-2026')
    const result = await verifyGalleryPasswordHash('studio-secret-2026', hash)
    expect(result).toEqual({ valid: true, needsRehash: false })
  })

  it('valid=false, needsRehash=false for the wrong password against an argon2id hash', async () => {
    const hash = await hashGalleryPassword('studio-secret-2026')
    const result = await verifyGalleryPasswordHash('wrong-password', hash)
    expect(result).toEqual({ valid: false, needsRehash: false })
  })

  it('an already-Argon2id hash is never flagged for rehash, even on repeated successful verification', async () => {
    const hash = await hashGalleryPassword('repeat-verify')
    const first = await verifyGalleryPasswordHash('repeat-verify', hash)
    const second = await verifyGalleryPasswordHash('repeat-verify', hash)
    expect(first.needsRehash).toBe(false)
    expect(second.needsRehash).toBe(false)
  })
})

describe('verifyGalleryPasswordHash: legacy SHA-256 hashes', () => {
  it('valid=true, needsRehash=true for the correct password against a legacy hash', async () => {
    const legacyHash = legacySha256('legacy-password-1')
    const result = await verifyGalleryPasswordHash('legacy-password-1', legacyHash)
    expect(result).toEqual({ valid: true, needsRehash: true })
  })

  it('valid=false, needsRehash=false for the wrong password against a legacy hash (never rehash on failure)', async () => {
    const legacyHash = legacySha256('legacy-password-1')
    const result = await verifyGalleryPasswordHash('totally-wrong', legacyHash)
    expect(result).toEqual({ valid: false, needsRehash: false })
  })

  it('is case-sensitive and exact on the password (legacy behavior preserved)', async () => {
    const legacyHash = legacySha256('CaseSensitive')
    expect((await verifyGalleryPasswordHash('casesensitive', legacyHash)).valid).toBe(false)
    expect((await verifyGalleryPasswordHash('CaseSensitive', legacyHash)).valid).toBe(true)
  })
})

describe('verifyGalleryPasswordHash: unrecognized hash formats fail closed', () => {
  it('valid=false, needsRehash=false for an empty stored hash value', async () => {
    expect(await verifyGalleryPasswordHash('anything', '')).toEqual({ valid: false, needsRehash: false })
  })

  it('valid=false, needsRehash=false for a malformed / non-hex, non-argon2 value', async () => {
    expect(await verifyGalleryPasswordHash('anything', 'not-a-real-hash-at-all')).toEqual({ valid: false, needsRehash: false })
  })

  it('valid=false, needsRehash=false for a truncated/corrupted argon2-looking prefix', async () => {
    expect(await verifyGalleryPasswordHash('anything', '$argon2id$corrupted')).toEqual({ valid: false, needsRehash: false })
  })
})

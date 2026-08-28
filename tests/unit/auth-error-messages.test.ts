import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'

// Phase 11 Step 10 regression coverage: every auth page (login, signup,
// forgot/reset password, callback) previously rendered raw
// Supabase-Auth-error.message (or, in auth/callback, a redirect-controlled
// error_description query param) directly to the user. getAuthErrorMessage
// is an allowlist -- this proves known messages get friendlier copy, and
// anything NOT on the allowlist (including an attacker-supplied string
// crafted to look like a real error) falls back to a generic message
// rather than being shown verbatim.

describe('getAuthErrorMessage', () => {
  it('translates a known GoTrue message to friendlier copy', () => {
    expect(getAuthErrorMessage('Invalid login credentials')).toBe('Incorrect email or password. Please try again.')
  })

  it('translates "User already registered" for the signup flow', () => {
    expect(getAuthErrorMessage('User already registered')).toBe('An account with this email already exists. Try signing in instead.')
  })

  it('passes through a recognized rate-limit pattern verbatim (safe, instructive)', () => {
    const msg = 'For security purposes, you can only request this after 42 seconds.'
    expect(getAuthErrorMessage(msg)).toBe(msg)
  })

  it('falls back to a generic message for an unrecognized string', () => {
    expect(getAuthErrorMessage('relation "auth.users" does not exist')).toBe('Something went wrong. Please try again.')
  })

  it('falls back to a generic message for attacker-supplied redirect content', () => {
    // The exact vector this guards against: auth/callback previously
    // rendered ?error_description= from the URL directly.
    expect(getAuthErrorMessage('<script>alert(1)</script> your account was hacked, call this number')).toBe(
      'Something went wrong. Please try again.'
    )
  })

  it('falls back to a generic message for null/empty input', () => {
    expect(getAuthErrorMessage(null)).toBe('Something went wrong. Please try again.')
    expect(getAuthErrorMessage(undefined)).toBe('Something went wrong. Please try again.')
    expect(getAuthErrorMessage('')).toBe('Something went wrong. Please try again.')
  })
})

/**
 * Translates a raw Supabase Auth (GoTrue) error message into safe,
 * user-facing copy. Every login/signup/password-reset page previously
 * rendered `authError.message` directly -- almost always fine in practice
 * (GoTrue's own messages are written to be user-facing), but nothing
 * stopped an unrecognized/future error, a raw network exception message, or
 * (in auth/callback) a redirect-controlled `error_description` query
 * param from reaching the user unfiltered. This is deliberately an
 * allowlist, not a denylist: an unrecognized message falls back to a
 * generic one rather than being shown as-is, so a message we didn't
 * anticipate can never leak an implementation detail.
 */

const KNOWN_AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password. Please try again.',
  'Email not confirmed': "Please confirm your email before signing in — check your inbox for the confirmation link.",
  'User already registered': 'An account with this email already exists. Try signing in instead.',
  'Unable to validate email address: invalid format': 'Please enter a valid email address.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters.',
  'New password should be different from the old password.': 'Your new password must be different from your current password.',
  'Auth session missing!': 'Your session has expired. Please sign in again.',
  'Email rate limit exceeded': "You've requested this too many times. Please wait a few minutes and try again.",
  'Token has expired or is invalid': 'This link has expired or was already used. Please request a new one.',
}

// Rate-limit messages carry a variable wait time that's genuinely useful to
// show, and don't reveal anything sensitive.
const SAFE_PATTERNS: RegExp[] = [
  /^For security purposes, you can only request this after \d+ seconds\.?$/i,
]

export function getAuthErrorMessage(rawMessage: string | null | undefined): string {
  if (!rawMessage) return 'Something went wrong. Please try again.'
  if (KNOWN_AUTH_ERRORS[rawMessage]) return KNOWN_AUTH_ERRORS[rawMessage]
  if (SAFE_PATTERNS.some((re) => re.test(rawMessage))) return rawMessage
  return 'Something went wrong. Please try again.'
}

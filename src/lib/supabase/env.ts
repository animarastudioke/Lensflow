function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// Every request goes through these (middleware calls them unconditionally,
// before even the public/auth path check) -- a missing/malformed value here
// previously fell back to a silent 'https://placeholder.supabase.co' /
// 'placeholder-anon-key' pair instead of failing loudly, so a misconfigured
// production deploy would serve every page from a client pointed at a
// nonexistent domain (confusing per-feature network errors) rather than a
// single clear, actionable startup error. Matches the getEnv() convention
// already used in storage/r2.ts and payments/mpesa.ts.
export function getSupabaseUrl(): string {
  const value = process.env['NEXT_PUBLIC_SUPABASE_URL']
  if (!isValidHttpUrl(value)) {
    throw new Error('Missing or invalid required environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }
  return value
}

export function getSupabaseAnonKey(): string {
  const value = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  if (!value) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return value
}

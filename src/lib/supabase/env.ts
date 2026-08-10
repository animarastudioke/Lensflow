const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_ANON_KEY = 'placeholder-anon-key'

function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function getSupabaseUrl(): string {
  const value = process.env['NEXT_PUBLIC_SUPABASE_URL']
  return isValidHttpUrl(value) ? value : PLACEHOLDER_URL
}

export function getSupabaseAnonKey(): string {
  return process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || PLACEHOLDER_ANON_KEY
}

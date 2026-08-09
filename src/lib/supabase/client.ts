import { createBrowserClient as createBrowserClientFn } from '@supabase/ssr'

export function createBrowserSupabaseClient() {
  return createBrowserClientFn(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
  )
}

export const createBrowserClient = createBrowserSupabaseClient

export default createBrowserSupabaseClient
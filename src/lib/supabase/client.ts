import { createBrowserClient as createBrowserClientFn } from '@supabase/ssr'
import { getSupabaseUrl, getSupabaseAnonKey } from './env'

export function createBrowserSupabaseClient() {
  return createBrowserClientFn(getSupabaseUrl(), getSupabaseAnonKey())
}

export const createBrowserClient = createBrowserSupabaseClient

export default createBrowserSupabaseClient
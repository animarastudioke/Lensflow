'use client'

import { createContext, useContext, useEffect, useState, ReactNode, createElement } from 'react'
import { Session } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase/client'
import type { UserRole } from './permissions'

export type { UserRole }

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: UserRole
  studioId?: string
}

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserClient()

  const fetchUser = async (session: Session | null) => {
    if (!session?.user) {
      setUser(null)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, avatar_url, role, studio_id')
      .eq('id', session.user.id)
      .single()

    if (profile) {
      setUser({
        id: profile.id,
        email: profile.email,
        firstName: profile['first_name'],
        lastName: profile['last_name'],
        avatarUrl: profile['avatar_url'],
        role: profile['role'] as UserRole,
        studioId: profile.studio_id,
      })
    } else {
      setUser({
        id: session.user.id,
        email: session.user.email!,
        firstName: session.user.user_metadata?.['first_name'] || 'User',
        lastName: session.user.user_metadata?.['last_name'] || '',
        avatarUrl: session.user.user_metadata?.['avatar_url'],
        role: (session.user.user_metadata?.['role'] as UserRole) || 'client',
      })
    }
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetchUser(session)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      fetchUser(session).finally(() => setIsLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      await fetchUser(session)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = { user, session, isLoading, signOut, refreshUser }

  return createElement(
    AuthContext.Provider,
    { value },
    children
  )
}

export function useAuthUser() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthUser must be used within an AuthProvider')
  }
  return context
}

export function getAuthUserServer() {
  return null
}
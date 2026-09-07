import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Regression coverage for the OAuth/magic-link/recovery/signup-confirmation
// homepage-bounce bug: createBrowserClient (from @supabase/ssr) hardcodes
// flowType: 'pkce', which makes the Supabase SDK's own automatic hash
// detection (getSession()/onAuthStateChange picking up a `#access_token=`
// URL on mount) silently reject any implicit-grant hash -- the exact shape
// Supabase delivers for magic links, signup confirmation, email-change
// confirmation, and password recovery, and for OAuth whenever Supabase's
// redirect falls back to the Site URL. The fix parses the hash directly and
// calls setSession() instead of relying on that automatic detection.

const routerReplace = vi.fn()
const routerPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: routerPush, refresh: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

const setSessionMock = vi.fn()
const getSessionMock = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      setSession: (...args: unknown[]) => setSessionMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
      updateUser: vi.fn(),
    },
  }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const FAKE_SESSION = { user: { id: 'user-1' } }

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('HomeSessionRedirect: establishes a session from an implicit-grant hash directly', () => {
  it('parses access_token/refresh_token from the hash and calls setSession (not just getSession)', async () => {
    window.history.replaceState(null, '', '/#access_token=tok-1&refresh_token=ref-1&type=bearer&token_type=bearer')
    setSessionMock.mockResolvedValue({ data: { session: FAKE_SESSION } })

    const { HomeSessionRedirect } = await import('@/components/marketing/home/session-redirect')
    render(<HomeSessionRedirect />)

    await waitFor(() => {
      expect(setSessionMock).toHaveBeenCalledWith({ access_token: 'tok-1', refresh_token: 'ref-1' })
    })
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/dashboard'))
  })

  it('routes a recovery-type session to /auth/reset-password instead of /dashboard', async () => {
    window.history.replaceState(null, '', '/#access_token=tok-2&refresh_token=ref-2&type=recovery')
    setSessionMock.mockResolvedValue({ data: { session: FAKE_SESSION } })

    const { HomeSessionRedirect } = await import('@/components/marketing/home/session-redirect')
    render(<HomeSessionRedirect />)

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/auth/reset-password'))
  })

  it('does nothing on a plain cold visit with no hash', async () => {
    window.history.replaceState(null, '', '/')

    const { HomeSessionRedirect } = await import('@/components/marketing/home/session-redirect')
    render(<HomeSessionRedirect />)

    await new Promise((r) => setTimeout(r, 10))
    expect(setSessionMock).not.toHaveBeenCalled()
    expect(routerReplace).not.toHaveBeenCalled()
  })

  it('does not redirect when setSession fails to establish a session', async () => {
    window.history.replaceState(null, '', '/#access_token=tok-3&refresh_token=ref-3&type=bearer')
    setSessionMock.mockResolvedValue({ data: { session: null } })

    const { HomeSessionRedirect } = await import('@/components/marketing/home/session-redirect')
    render(<HomeSessionRedirect />)

    await waitFor(() => expect(setSessionMock).toHaveBeenCalled())
    expect(routerReplace).not.toHaveBeenCalled()
  })
})

describe('ResetPasswordPage: recovery tokens arrive as a hash, not query params', () => {
  it('establishes the session from the hash via setSession and shows the reset form', async () => {
    window.history.replaceState(null, '', '/auth/reset-password#access_token=tok-4&refresh_token=ref-4&type=recovery')
    setSessionMock.mockResolvedValue({ data: { session: FAKE_SESSION } })

    const { default: ResetPasswordPage } = await import('@/app/auth/(auth)/reset-password/page')
    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(setSessionMock).toHaveBeenCalledWith({ access_token: 'tok-4', refresh_token: 'ref-4' })
    })
    await waitFor(() => expect(screen.getByText(/Reset your password/i)).toBeInTheDocument())
  })

  it('falls back to an existing session when no hash is present (arrived via HomeSessionRedirect)', async () => {
    window.history.replaceState(null, '', '/auth/reset-password')
    getSessionMock.mockResolvedValue({ data: { session: FAKE_SESSION } })

    const { default: ResetPasswordPage } = await import('@/app/auth/(auth)/reset-password/page')
    render(<ResetPasswordPage />)

    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/Reset your password/i)).toBeInTheDocument())
  })

  it('shows "Invalid reset link" when there is neither a hash nor an existing session', async () => {
    window.history.replaceState(null, '', '/auth/reset-password')
    getSessionMock.mockResolvedValue({ data: { session: null } })

    const { default: ResetPasswordPage } = await import('@/app/auth/(auth)/reset-password/page')
    render(<ResetPasswordPage />)

    await waitFor(() => expect(screen.getByText(/Invalid reset link/i)).toBeInTheDocument())
  })
})

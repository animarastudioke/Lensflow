import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

// Phase 11 Step 7 regression coverage: the mobile navigation drawer
// (MobileSidebarTrigger) rendered every nav item identically regardless
// of the current route -- no active-state styling, no aria-current --
// unlike the desktop sidebar, which already computes both from
// usePathname(). This proves the mobile drawer now matches.

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/test-studio/galleries',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/lib/auth/hooks', () => ({
  useAuthUser: () => ({
    user: { id: 'user-1', email: 'a@b.com', firstName: 'Ada', lastName: 'Lovelace', role: 'studio_owner' },
    signOut: vi.fn(),
  }),
}))

// sidebar.tsx resolves this via a runtime require() (its own comment:
// "avoid circular dependency"), which Vitest's module graph doesn't
// intercept the same way as a top-level import unless mocked directly.
// studio_owner legitimately has every permission, so a permissive stub
// matches real behavior for this test's role.
vi.mock('@/lib/auth/permissions', () => ({
  hasPermission: () => true,
}))

const { MobileSidebarTrigger } = await import('@/components/layout/sidebar')

describe('MobileSidebarTrigger: active route highlighting', () => {
  it('marks the current route with aria-current="page" and leaves others unmarked', () => {
    render(<MobileSidebarTrigger studioSlug="test-studio" />)
    fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }))

    const activeLink = screen.getByRole('link', { name: /galleries/i })
    expect(activeLink).toHaveAttribute('aria-current', 'page')
    expect(activeLink).toHaveAttribute('href', '/dashboard/test-studio/galleries')

    const inactiveLink = screen.getByRole('link', { name: /clients/i })
    expect(inactiveLink).not.toHaveAttribute('aria-current')
  })

  it('visually distinguishes the active link from inactive ones', () => {
    render(<MobileSidebarTrigger studioSlug="test-studio" />)
    fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }))

    const activeLink = screen.getByRole('link', { name: /galleries/i })
    const inactiveLink = screen.getByRole('link', { name: /clients/i })
    expect(activeLink.className).toContain('bg-primary')
    expect(inactiveLink.className).not.toContain('bg-primary')
  })
})

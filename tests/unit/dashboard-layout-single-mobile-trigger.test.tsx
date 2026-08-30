import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Phase 11 Step 15: DashboardLayout rendered MobileSidebarTrigger directly
// AND rendered <Sidebar>, which renders its own MobileSidebarTrigger
// internally -- two identically aria-labeled "Open navigation menu"
// buttons stacked at the same fixed position. Confirmed via real browser
// QA (Playwright's strict-mode locator resolved to 2 elements). Only
// <Sidebar>'s own trigger should remain.

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/test-studio',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/lib/auth/hooks', () => ({
  useAuthUser: () => ({
    user: { id: 'user-1', email: 'a@b.com', firstName: 'Ada', lastName: 'Lovelace', role: 'studio_owner' },
    signOut: vi.fn(),
  }),
}))

vi.mock('@/lib/auth/permissions', () => ({
  hasPermission: () => true,
}))

vi.mock('@/components/layout/header', () => ({
  Header: () => <div>Header</div>,
}))

const { DashboardLayout } = await import('@/components/layout/dashboard-layout')

describe('DashboardLayout: exactly one mobile nav trigger', () => {
  it('renders "Open navigation menu" once, not twice', () => {
    render(
      <DashboardLayout studioSlug="test-studio">
        <div>content</div>
      </DashboardLayout>
    )
    expect(screen.getAllByRole('button', { name: 'Open navigation menu' })).toHaveLength(1)
  })
})

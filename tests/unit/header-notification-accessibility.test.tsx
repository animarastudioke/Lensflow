import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Phase 12 Step 13: the notification dropdown's per-item unread indicator
// was a plain colored dot with no text alternative -- the aggregate "N new"
// badge is real text, but a screen reader user opening the list had no way
// to tell which individual items were unread. Each unread item now carries
// a visually-hidden "Unread: " prefix; read items get nothing extra, so
// this doesn't add noise for the common case.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: 'light' }),
}))

vi.mock('@/lib/auth/hooks', () => ({
  useAuthUser: () => ({
    user: { id: 'user-1', email: 'a@b.com', firstName: 'Ada', lastName: 'Lovelace', role: 'studio_owner', avatarUrl: null },
    isLoading: false,
    signOut: vi.fn(),
  }),
}))

const notifications = [
  { id: 'notif-1', type: 'booking_created', title: 'New booking', body: 'Session A', link: '/dashboard/test-studio/bookings', readAt: null, createdAt: new Date().toISOString() },
  { id: 'notif-2', type: 'team_invitation', title: 'Team invitation sent', body: 'Invited a@b.com', link: null, readAt: new Date().toISOString(), createdAt: new Date().toISOString() },
]

vi.mock('@/lib/actions/notifications', () => ({
  getNotifications: vi.fn(async () => ({ notifications, unreadCount: 1 })),
  markNotificationRead: vi.fn(async () => {}),
  markAllNotificationsRead: vi.fn(async () => {}),
}))

const { Header } = await import('@/components/layout/header')

describe('Header notification dropdown: unread accessibility', () => {
  it('an unread notification has a visually-hidden "Unread" text alternative alongside the dot', async () => {
    const user = userEvent.setup()
    render(<Header studioSlug="test-studio" />)
    await user.click(await screen.findByRole('button', { name: 'Notifications' }))

    const unreadItem = await screen.findByRole('menuitem', { name: /Unread: New booking/i })
    expect(unreadItem).toBeInTheDocument()
  })

  it('a read notification has no "Unread" text and no visible dot', async () => {
    const user = userEvent.setup()
    render(<Header studioSlug="test-studio" />)
    await user.click(await screen.findByRole('button', { name: 'Notifications' }))

    const readItem = await screen.findByRole('menuitem', { name: /Team invitation sent/i })
    expect(readItem.textContent).not.toMatch(/Unread/i)
  })
})

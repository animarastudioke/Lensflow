import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Phase 11 Step 10 regression coverage: Settings previously showed one
// page-level "Save Changes" button on every tab. For General/Branding it
// called a real Server Action; for every other tab (Notifications,
// Security, Billing, Integrations, Advanced) clicking it ran a bare
// `setTimeout` and then reported "Saved" regardless -- persisting nothing.
// This proves the button is now only rendered on tabs that actually have
// something to save through it, and that Notifications/Security present
// their real, honest state instead of fake controls.

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}))

const updateStudioSettingsMock = vi.fn()
const updateStudioBrandingMock = vi.fn()
vi.mock('@/lib/actions/studios', () => ({
  deleteStudio: vi.fn(),
  updateStudioSettings: (...args: unknown[]) => updateStudioSettingsMock(...args),
  updateStudioBranding: (...args: unknown[]) => updateStudioBrandingMock(...args),
  uploadStudioLogo: vi.fn(),
}))

vi.mock('@/lib/actions/subscription-payments', () => ({
  cancelSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  cancelPendingDowngrade: vi.fn(),
}))

const signInWithPasswordMock = vi.fn()
const updateUserMock = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
    },
  }),
}))

vi.mock('@/lib/auth/hooks', () => ({
  useAuthUser: () => ({ user: { id: 'user-1', email: 'owner@example.com' } }),
}))

vi.mock('@/components/settings/SubscribeDialog', () => ({
  SubscribeDialog: ({ trigger }: { trigger: React.ReactNode }) => trigger,
}))

const { SettingsPage } = await import('@/components/settings/SettingsPage')

const baseProps = {
  studioSlug: 'test-studio',
  studioName: 'Test Studio',
  isOwner: true,
  settings: null,
  billing: null,
  paymentHistory: [],
}

async function openTab(name: RegExp) {
  const user = userEvent.setup()
  render(<SettingsPage {...baseProps} />)
  await user.click(screen.getByRole('tab', { name }))
  return user
}

beforeEach(() => {
  updateStudioSettingsMock.mockReset()
  updateStudioBrandingMock.mockReset()
  signInWithPasswordMock.mockReset()
  updateUserMock.mockReset()
  toastSuccess.mockReset()
  toastError.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Settings: Save Changes only appears where it does something real', () => {
  it('shows Save Changes on the General tab and it calls the real Server Action', async () => {
    updateStudioSettingsMock.mockResolvedValue(undefined)
    render(<SettingsPage {...baseProps} />)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => expect(updateStudioSettingsMock).toHaveBeenCalledWith('test-studio', expect.any(FormData)))
  })

  it('shows Save Changes on the Branding tab and it calls the real Server Action', async () => {
    updateStudioBrandingMock.mockResolvedValue(undefined)
    await openTab(/branding/i)

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(updateStudioBrandingMock).toHaveBeenCalled())
  })

  it('renders no Save Changes button on the Notifications tab', async () => {
    await openTab(/notifications/i)
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('renders no Save Changes button on the Security tab', async () => {
    await openTab(/security/i)
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('renders no Save Changes button on the Billing tab', async () => {
    await openTab(/billing/i)
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('renders no Save Changes button on the Integrations tab', async () => {
    await openTab(/integrations/i)
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('renders no Save Changes button on the Advanced tab', async () => {
    await openTab(/advanced/i)
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })
})

describe('Settings: Notifications tab is an honest empty state, not fake controls', () => {
  it('has no toggle switches and states plainly that preferences are not configurable yet', async () => {
    await openTab(/notifications/i)
    expect(screen.getByText(/aren.t configurable yet/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
  })
})

describe('Settings: a Server Action that never reaches the server is reported, not swallowed', () => {
  it('shows an error toast and re-enables the button when updateStudioSettings rejects outright (e.g. the network drops mid-request)', async () => {
    updateStudioSettingsMock.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<SettingsPage {...baseProps} />)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Could not save changes. Check your connection and try again.'))
    await waitFor(() => expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled())
  })
})

describe('Settings: Security tab has a real, working password change', () => {
  it('verifies the current password, then updates to the new one', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null })
    updateUserMock.mockResolvedValue({ error: null })
    await openTab(/security/i)

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'OldPass1!' } })
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'NewPass1!' } })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'NewPass1!' } })

    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => expect(signInWithPasswordMock).toHaveBeenCalledWith({ email: 'owner@example.com', password: 'OldPass1!' }))
    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith({ password: 'NewPass1!' }))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Password updated'))
  })

  it('rejects an incorrect current password without calling updateUser', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    await openTab(/security/i)

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'WrongPass1!' } })
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'NewPass1!' } })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'NewPass1!' } })

    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => expect(screen.getByText('Current password is incorrect.')).toBeInTheDocument())
    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('rejects a new password that does not meet requirements before calling Supabase at all', async () => {
    await openTab(/security/i)

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'OldPass1!' } })
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'weak' } })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'weak' } })

    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => expect(screen.getByText(/does not meet the requirements/i)).toBeInTheDocument())
    expect(signInWithPasswordMock).not.toHaveBeenCalled()
  })

  it('states plainly that 2FA and session management are not available, with no fake toggle', async () => {
    await openTab(/security/i)
    expect(screen.getByText(/two-factor authentication and session management aren.t available yet/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
  })
})

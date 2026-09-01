import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Phase 11 Step 6 / Step 11 regression coverage: GalleryDetail's Settings
// tab previously rendered every field as an uncontrolled defaultValue/
// defaultChecked input with no onChange, and "Save Changes" had no
// onClick at all -- a photographer who edited these fields and clicked
// Save received no error, no feedback, and no persistence whatsoever, a
// silent no-op that looked identical to a successful save. This file
// proves the fix: the tab is now a real controlled form wired to the
// existing updateGallery() Server Action, with genuine pending/success/
// failure feedback and duplicate-submission prevention.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} alt={(props.alt as string) ?? ''} />
  },
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}))

const updateGalleryMock = vi.fn()
vi.mock('@/lib/actions/galleries', () => ({
  createAlbum: vi.fn(),
  updateAlbum: vi.fn(),
  deleteAlbum: vi.fn(),
  duplicateAlbum: vi.fn(),
  assignMediaToAlbum: vi.fn(),
  setMediaFavorite: vi.fn(),
  deleteMedia: vi.fn(),
  updateGalleryStatus: vi.fn(async () => ({ success: true })),
  updateGallery: (...args: unknown[]) => updateGalleryMock(...args),
}))

const { GalleryDetail } = await import('@/components/galleries/GalleryDetail')
type Gallery = React.ComponentProps<typeof GalleryDetail>['initialGallery']

function makeGallery(overrides: Partial<Gallery> = {}): Gallery {
  return {
    id: 'gallery-1',
    name: 'Original Gallery Name',
    description: 'Original description',
    status: 'draft',
    type: 'wedding',
    passwordProtected: false,
    expiryDays: undefined,
    downloadEnabled: true,
    watermarkEnabled: false,
    allowFavorites: true,
    allowComments: true,
    requireEmail: false,
    images: [],
    albums: [],
    shareToken: 'share-token-123',
    settings: { primaryColor: '#800020' },
    stats: { views: 0, downloads: 0, favorites: 0 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// Radix Tabs' trigger activation is focus/pointer-driven (a roving-focus
// group, not a plain click handler), which plain fireEvent.click cannot
// reliably simulate in jsdom -- userEvent replicates the full pointer
// event sequence a real browser would produce. Everything after the tab
// is open (typing, clicking Save/Cancel) uses plain fireEvent, since
// those are ordinary buttons/inputs.
async function openSettingsTab() {
  const user = userEvent.setup()
  render(<GalleryDetail studioSlug="test-studio" initialGallery={makeGallery()} />)
  await user.click(screen.getByRole('tab', { name: /settings/i }))
}

beforeEach(() => {
  updateGalleryMock.mockReset()
  toastSuccess.mockReset()
  toastError.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GalleryDetail Settings tab: save wiring', () => {
  it('submitting calls updateGallery with the edited values, the gallery id, and the studio slug', async () => {
    updateGalleryMock.mockResolvedValue(undefined)
    await openSettingsTab()

    const nameInput = screen.getByLabelText('Gallery Name')
    fireEvent.change(nameInput, { target: { value: 'Renamed Gallery' } })

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(updateGalleryMock).toHaveBeenCalledTimes(1))
    const submittedFormData = updateGalleryMock.mock.calls[0]![0] as FormData
    expect(submittedFormData.get('id')).toBe('gallery-1')
    expect(submittedFormData.get('studio_slug')).toBe('test-studio')
    expect(submittedFormData.get('name')).toBe('Renamed Gallery')
  })

  it('shows a pending state while the save is in flight and success feedback once it resolves', async () => {
    let resolveSave!: () => void
    updateGalleryMock.mockReturnValue(new Promise<void>((resolve) => { resolveSave = resolve }))
    await openSettingsTab()

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => expect(within(saveButton).getByText(/loading/i)).toBeInTheDocument())
    expect(saveButton).toBeDisabled()

    resolveSave()
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Gallery settings saved'))
  })

  it('does not submit a second time while a save is already pending', async () => {
    let resolveSave!: () => void
    updateGalleryMock.mockReturnValue(new Promise<void>((resolve) => { resolveSave = resolve }))
    await openSettingsTab()

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)
    // Button is disabled while pending, matching every other async-submit
    // button in this codebase (e.g. EditGalleryForm) -- a second click
    // physically cannot fire, which is the actual duplicate-submit guard.
    await waitFor(() => expect(saveButton).toBeDisabled())
    fireEvent.click(saveButton)

    expect(updateGalleryMock).toHaveBeenCalledTimes(1)
    resolveSave()
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1))
  })

  it('surfaces a thrown failure inline and via toast, and leaves the form editable again', async () => {
    updateGalleryMock.mockRejectedValue(new Error('Failed to update gallery'))
    await openSettingsTab()

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(screen.getByText('Failed to update gallery')).toBeInTheDocument())
    expect(toastError).toHaveBeenCalledWith('Failed to update gallery')
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
  })

  it('treats a NEXT_REDIRECT throw as Next.js navigating away, not a failure', async () => {
    // Matches the same NEXT_REDIRECT handling already established in
    // EditGalleryForm.tsx: updateGallery() redirects on success by
    // throwing Next's special NEXT_REDIRECT signal, which real navigation
    // intercepts before any further UI matters -- so neither an error nor
    // a synthetic success toast is shown here, it's simply not re-thrown
    // as a user-facing failure.
    const redirectError = new Error('NEXT_REDIRECT')
    updateGalleryMock.mockRejectedValue(redirectError)
    await openSettingsTab()

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled())
    expect(toastError).not.toHaveBeenCalled()
    expect(screen.queryByText('NEXT_REDIRECT')).not.toBeInTheDocument()
  })

  it('Cancel resets edited fields back to the saved values without submitting', async () => {
    await openSettingsTab()

    const nameInput = screen.getByLabelText('Gallery Name') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Unsaved Edit' } })
    expect(nameInput.value).toBe('Unsaved Edit')

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(nameInput.value).toBe('Original Gallery Name')
    expect(updateGalleryMock).not.toHaveBeenCalled()
  })
})

// Phase 11 Step 13 regression coverage: "Allow Comments" and "Watermark
// Images" both persisted to a real column via updateGallery(), but neither
// had any consumer anywhere on the client-facing gallery -- no commenting
// UI exists at all, and the upload pipeline never composites a watermark.
// A toggle that saves but does nothing is a deceptive control (Step 10's
// "honest absence over a deceptive control" rule), so both were removed
// from this tab. These prove the controls are gone and that removing them
// did not turn into a silent reset of whatever a gallery's existing values
// already were.
describe('GalleryDetail Settings tab: no controls for non-functional flags', () => {
  it('does not render "Allow Comments" or "Watermark Images" toggles -- neither has any real effect on the public gallery', async () => {
    await openSettingsTab()
    expect(screen.queryByText('Allow Comments')).not.toBeInTheDocument()
    expect(screen.queryByText('Watermark Images')).not.toBeInTheDocument()
  })

  it('a save resubmits the gallery\'s existing allow_comments/watermark_enabled unchanged, not a reset default', async () => {
    updateGalleryMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <GalleryDetail
        studioSlug="test-studio"
        initialGallery={makeGallery({ allowComments: false, watermarkEnabled: true })}
      />
    )
    await user.click(screen.getByRole('tab', { name: /settings/i }))

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(updateGalleryMock).toHaveBeenCalledTimes(1))
    const submittedFormData = updateGalleryMock.mock.calls[0]![0] as FormData
    expect(submittedFormData.get('allow_comments')).toBe('false')
    expect(submittedFormData.get('watermark_enabled')).toBe('true')
  })
})

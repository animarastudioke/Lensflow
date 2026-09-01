import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

// Phase 11 Step 13 coverage: GalleryList previously hand-rolled its own
// header, empty states, status pills, view-mode toggle, and a plain Dialog
// for delete instead of the shared PageHeader/EmptyState/StatusBadge/
// ViewToggle/ConfirmDialog primitives every other Phase 11 list already
// uses. This proves the migration preserved real behavior: real data still
// renders (no fabricated galleries), the honest empty state still explains
// what's missing, status renders through the shared semantic map, the view
// toggle still switches views, and delete still requires confirmation
// before calling the real Server Action.

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const deleteGalleryMock = vi.fn()
const updateGalleryStatusMock = vi.fn()
vi.mock('@/lib/actions/galleries', () => ({
  deleteGallery: (...args: unknown[]) => deleteGalleryMock(...args),
  updateGalleryStatus: (...args: unknown[]) => updateGalleryStatusMock(...args),
}))

const { GalleryList } = await import('@/components/galleries/GalleryList')

function makeGallery(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'gallery-1',
    name: 'Smith Wedding',
    description: undefined,
    coverImage: undefined,
    status: 'published' as const,
    type: 'wedding' as const,
    clientId: 'client-1',
    clientName: 'Real Client',
    shootDate: '2026-01-01',
    mediaCount: 42,
    viewCount: 10,
    downloadCount: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    shareToken: 'tok123',
    passwordProtected: false,
    expiresAt: undefined,
    ...overrides,
  }
}

describe('GalleryList: real data, no fabricated galleries', () => {
  it('renders the real gallery passed in', () => {
    render(<GalleryList studioSlug="test-studio" initialGalleries={[makeGallery()]} />)
    expect(screen.getByText('Smith Wedding')).toBeInTheDocument()
  })

  it('shows the shared EmptyState, with a real Create Gallery action, when there are truly no galleries', () => {
    render(<GalleryList studioSlug="test-studio" initialGalleries={[]} />)
    expect(screen.getByText('No galleries found')).toBeInTheDocument()
    // "Create Gallery" appears both in the PageHeader action and the
    // EmptyState action -- both must point at the real create route.
    const createLinks = screen.getAllByRole('link', { name: /create gallery/i })
    expect(createLinks.length).toBeGreaterThanOrEqual(2)
    createLinks.forEach((link) => expect(link).toHaveAttribute('href', '/dashboard/test-studio/galleries/new'))
  })
})

describe('GalleryList: status renders through the shared StatusBadge map', () => {
  it('a published gallery shows a success-toned badge (matches STATUS_VARIANT_MAP.published)', () => {
    render(<GalleryList studioSlug="test-studio" initialGalleries={[makeGallery({ status: 'published' })]} />)
    const badge = screen.getAllByText('Published').find((el) => el.className.includes('success'))
    expect(badge).toBeDefined()
  })

  it('a draft gallery shows a neutral badge, not an alarming color', () => {
    render(<GalleryList studioSlug="test-studio" initialGalleries={[makeGallery({ status: 'draft' })]} />)
    const badge = screen.getAllByText('Draft').find((el) => el.className.includes('secondary'))
    expect(badge).toBeDefined()
  })
})

describe('GalleryList: delete requires confirmation before calling the Server Action', () => {
  it('clicking delete on a card opens ConfirmDialog first, and only calls deleteGallery once confirmed', async () => {
    deleteGalleryMock.mockResolvedValue(undefined)
    render(<GalleryList studioSlug="test-studio" initialGalleries={[makeGallery()]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete gallery' }))
    expect(deleteGalleryMock).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteGalleryMock).toHaveBeenCalledWith('gallery-1', 'test-studio'))
    await waitFor(() => expect(screen.queryByText('Smith Wedding')).not.toBeInTheDocument())
  })

  it('keeps the gallery and re-opens on a failed delete instead of silently dropping it', async () => {
    deleteGalleryMock.mockRejectedValue(new Error('Failed to delete gallery'))
    render(<GalleryList studioSlug="test-studio" initialGalleries={[makeGallery()]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete gallery' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteGalleryMock).toHaveBeenCalled())
    // The dialog's onConfirm threw, so ConfirmDialog's contract keeps it open
    // and the row must still be present, not optimistically removed.
    expect(screen.getByText('Smith Wedding')).toBeInTheDocument()
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('GalleryList: view toggle uses the shared ViewToggle primitive', () => {
  it('switches to table view via the accessible toggle and keeps the real data visible', () => {
    render(<GalleryList studioSlug="test-studio" initialGalleries={[makeGallery()]} />)
    const tableToggle = screen.getByRole('button', { name: 'Table view' })
    expect(tableToggle).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(tableToggle)

    expect(tableToggle).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Smith Wedding')).toBeInTheDocument()
  })
})

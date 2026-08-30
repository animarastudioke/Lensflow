import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

// Phase 12 Step 13: GalleryDetail's album-delete confirmation previously
// used a raw Dialog (role="dialog", no pending/loading protection against
// a double-click firing deleteAlbum twice) instead of the shared
// ConfirmDialog every other list in this app already uses for destructive
// actions. Migrated to ConfirmDialog with the exact same copy/behavior;
// this proves the migration didn't change what the user experiences --
// still opens on "Delete", still asks for confirmation, Cancel still backs
// out without calling the Server Action, Confirm still calls it exactly
// once and shows the same success feedback, Escape still dismisses it.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} alt={(props.alt as string) ?? ''} />
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const deleteAlbumMock = vi.fn(async () => ({ success: true }))

vi.mock('@/lib/actions/galleries', () => ({
  createAlbum: vi.fn(),
  updateAlbum: vi.fn(),
  deleteAlbum: (...args: unknown[]) => deleteAlbumMock(...args),
  duplicateAlbum: vi.fn(),
  assignMediaToAlbum: vi.fn(),
  setMediaFavorite: vi.fn(),
  deleteMedia: vi.fn(),
  updateGalleryStatus: vi.fn(async () => ({ success: true })),
  updateGallery: vi.fn(),
}))

const { GalleryDetail } = await import('@/components/galleries/GalleryDetail')
type Gallery = React.ComponentProps<typeof GalleryDetail>['initialGallery']

function makeGallery(overrides: Partial<Gallery> = {}): Gallery {
  return {
    id: 'gallery-1',
    name: 'Smith Wedding',
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
    albums: [
      { id: 'album-1', name: 'Ceremony', description: undefined, coverImageUrl: undefined, imageCount: 3, sortOrder: 0, createdAt: '2026-01-01T00:00:00Z' },
    ],
    shareToken: 'share-token-123',
    settings: { primaryColor: '#800020' },
    stats: { views: 0, downloads: 0, favorites: 0 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

async function openAlbumDeleteConfirm() {
  const user = userEvent.setup()
  render(<GalleryDetail studioSlug="test-studio" initialGallery={makeGallery()} />)
  await user.click(screen.getByRole('tab', { name: /Albums/i }))
  await user.click(await screen.findByRole('button', { name: 'Actions for Ceremony' }))
  await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
  return user
}

describe('GalleryDetail: album-delete confirmation (migrated to shared ConfirmDialog)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('opens a real alertdialog with the album name in the description', async () => {
    await openAlbumDeleteConfirm()
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Delete album')
    expect(dialog).toHaveTextContent('Ceremony')
    expect(deleteAlbumMock).not.toHaveBeenCalled()
  })

  it('Cancel closes the dialog without calling deleteAlbum', async () => {
    const user = await openAlbumDeleteConfirm()
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(deleteAlbumMock).not.toHaveBeenCalled()
  })

  it('Delete calls deleteAlbum exactly once, shows success, and closes', async () => {
    const user = await openAlbumDeleteConfirm()
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: 'Delete', exact: true }))

    expect(deleteAlbumMock).toHaveBeenCalledTimes(1)
    expect(deleteAlbumMock).toHaveBeenCalledWith('album-1', 'gallery-1', 'test-studio')
    expect(toast.success).toHaveBeenCalledWith('Album deleted')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('Escape dismisses the dialog without calling deleteAlbum', async () => {
    const user = await openAlbumDeleteConfirm()
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(deleteAlbumMock).not.toHaveBeenCalled()
  })
})

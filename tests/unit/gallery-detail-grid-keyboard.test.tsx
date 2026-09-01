import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

// Phase 11 Step 15: revisits the Step 13 deferred finding -- GalleryDetail's
// image grid/masonry tiles (the dashboard side, not the already-fixed
// public gallery) were plain <div onClick>, unreachable by keyboard at all.
// The "list" view already had a keyboard path via its DropdownMenu's "View
// Full Size" item, but grid is the default view mode. Each tile is now a
// real tab stop (role="button"/tabIndex=0) wired to open the lightbox on
// Enter/Space, matching the pattern already fixed on the public gallery.

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

vi.mock('@/lib/actions/galleries', () => ({
  createAlbum: vi.fn(),
  updateAlbum: vi.fn(),
  deleteAlbum: vi.fn(),
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
    images: [
      {
        id: 'image-1', filename: 'photo-1.jpg', url: 'https://cdn.example/photo-1.jpg',
        thumbnailUrl: 'https://cdn.example/photo-1-thumb.jpg', width: 800, height: 600, size: 1000,
        mimeType: 'image', isFavorite: false, sortOrder: 0, uploadedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'image-2', filename: 'photo-2.jpg', url: 'https://cdn.example/photo-2.jpg',
        thumbnailUrl: 'https://cdn.example/photo-2-thumb.jpg', width: 800, height: 600, size: 1000,
        mimeType: 'image', isFavorite: false, sortOrder: 1, uploadedAt: '2026-01-01T00:00:00Z',
      },
    ],
    albums: [],
    shareToken: 'share-token-123',
    settings: { primaryColor: '#800020' },
    stats: { views: 0, downloads: 0, favorites: 0 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('GalleryDetail grid view: image tiles are keyboard-operable, not mouse-only', () => {
  it('a tile is a real tab stop and Enter opens the lightbox', () => {
    render(<GalleryDetail studioSlug="test-studio" initialGallery={makeGallery()} />)
    const tile = screen.getByRole('button', { name: 'View photo-1.jpg' })
    expect(tile).toHaveAttribute('tabIndex', '0')

    fireEvent.keyDown(tile, { key: 'Enter' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Space also opens the lightbox', () => {
    render(<GalleryDetail studioSlug="test-studio" initialGallery={makeGallery()} />)
    const tile = screen.getByRole('button', { name: 'View photo-2.jpg' })
    fireEvent.keyDown(tile, { key: ' ' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('the lightbox still closes on Escape (Step 6/13 behavior unregressed)', () => {
    render(<GalleryDetail studioSlug="test-studio" initialGallery={makeGallery()} />)
    fireEvent.click(screen.getByRole('button', { name: 'View photo-1.jpg' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

// The public gallery redesign (editorial hero, album filter, masonry/grid,
// swipe lightbox) must not change what a client can see or do. These cover the
// new behavior; public-gallery-lightbox-keyboard.test.tsx covers keyboard/focus.

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const { ClientGalleryContent } = await import('@/app/g/[token]/ClientGalleryContent')

function makeMedia(id: string, filename: string, albumId: string | null = null) {
  return {
    id,
    filename,
    url: `https://cdn.example/${id}-preview.webp`,
    thumbnail_url: `https://cdn.example/${id}-thumb.webp`,
    type: 'image' as const,
    size: 1000,
    width: 800,
    height: 1200,
    is_favorite: false,
    comment_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    album_id: albumId,
  }
}

function makeGallery(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'gallery-1',
    studio_id: 'studio-1',
    name: 'Nelly Graduation Shoot',
    description: 'A golden afternoon.',
    shoot_date: '2026-09-09T00:00:00Z',
    type: 'event' as const,
    media_count: 3,
    allow_download: true,
    allow_comments: true,
    allow_favorites: true,
    watermark_enabled: false,
    password_protected: false,
    share_token: 'tok-1',
    layout_type: 'grid' as const,
    cover_template: 'novel' as const,
    cover_image: 'https://cdn.example/cover.webp',
    media: [makeMedia('m1', 'a.jpg'), makeMedia('m2', 'b.jpg'), makeMedia('m3', 'c.jpg')],
    studio: { name: 'Test Studio', slug: 'test-studio' },
    ...overrides,
  }
}

describe('hero and metadata come from the gallery, nothing hardcoded', () => {
  it('renders the real title, description, date and photo count', () => {
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Nelly Graduation Shoot')
    expect(screen.getByText('A golden afternoon.')).toBeInTheDocument()
    expect(screen.getByText('Sep 9, 2026')).toBeInTheDocument()
    expect(screen.getByText('3 photos')).toBeInTheDocument()
  })

  it('uses singular "photo" for one photo', () => {
    render(<ClientGalleryContent gallery={makeGallery({ media_count: 1, media: [makeMedia('m1', 'a.jpg')] }) as never} token="tok-1" />)
    expect(screen.getByText('1 photo')).toBeInTheDocument()
  })
})

describe('album filter: real albums only', () => {
  it('shows no filter pills when the gallery has no albums', () => {
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    expect(screen.queryByRole('navigation', { name: 'Albums' })).not.toBeInTheDocument()
  })

  it('filters the grid by album without a server round-trip', () => {
    const gallery = makeGallery({
      albums: [{ id: 'al1', name: 'Portraits', media_count: 1, order: 0, created_at: '2026-01-01T00:00:00Z' }],
      media: [makeMedia('m1', 'a.jpg', 'al1'), makeMedia('m2', 'b.jpg'), makeMedia('m3', 'c.jpg')],
    })
    render(<ClientGalleryContent gallery={gallery as never} token="tok-1" />)
    fireEvent.click(screen.getByRole('button', { name: /^Portraits/ }))
    expect(screen.getByRole('button', { name: /view a\.jpg/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /view b\.jpg/i })).not.toBeInTheDocument()
  })

  // Regression: the lightbox used to walk the full media list while the grid
  // was filtered, so opening a photo inside an album could show another photo.
  it('opening a photo inside an album shows that photo and only navigates that album', () => {
    const gallery = makeGallery({
      albums: [{ id: 'al1', name: 'Portraits', media_count: 2, order: 0, created_at: '2026-01-01T00:00:00Z' }],
      media: [makeMedia('m1', 'a.jpg'), makeMedia('m2', 'b.jpg', 'al1'), makeMedia('m3', 'c.jpg', 'al1')],
    })
    render(<ClientGalleryContent gallery={gallery as never} token="tok-1" />)
    fireEvent.click(screen.getByRole('button', { name: /^Portraits/ }))
    fireEvent.click(screen.getByRole('button', { name: /view b\.jpg/i }))

    const dialog = screen.getByRole('dialog', { name: 'Image preview' })
    expect(within(dialog).getByRole('img')).toHaveAttribute('alt', 'b.jpg')
    expect(within(dialog).getByText('1 / 2')).toBeInTheDocument()
  })
})

describe('permissions are reflected in the UI', () => {
  it('hides favorite controls when favorites are disabled', () => {
    render(<ClientGalleryContent gallery={makeGallery({ allow_favorites: false }) as never} token="tok-1" />)
    expect(screen.queryByRole('button', { name: /add .* to favorites/i })).not.toBeInTheDocument()
  })

  it('hides download controls when downloads are disabled', () => {
    render(<ClientGalleryContent gallery={makeGallery({ allow_download: false }) as never} token="tok-1" />)
    expect(screen.queryByRole('button', { name: 'Download all' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /view a\.jpg/i }))
    expect(screen.queryByRole('button', { name: 'Download photo' })).not.toBeInTheDocument()
  })

  it('favorite button toggles and is exposed as a pressed toggle', () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as never
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    const fav = screen.getByRole('button', { name: 'Add a.jpg to favorites' })
    expect(fav).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(fav)
    expect(screen.getByRole('button', { name: 'Remove a.jpg from favorites' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('lightbox swipe navigation', () => {
  const swipe = (el: Element, fromX: number, toX: number, fromY = 200, toY = 205) => {
    fireEvent.touchStart(el, { touches: [{ clientX: fromX, clientY: fromY }] })
    fireEvent.touchEnd(el, { changedTouches: [{ clientX: toX, clientY: toY }] })
  }

  it('swipe left goes next, swipe right goes previous', () => {
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    fireEvent.click(screen.getByRole('button', { name: /view a\.jpg/i }))
    const stage = screen.getByRole('dialog').querySelector('[data-backdrop]')!.parentElement!
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    swipe(stage, 300, 100)
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    swipe(stage, 100, 300)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('ignores short or mostly-vertical gestures (scrolling, taps)', () => {
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    fireEvent.click(screen.getByRole('button', { name: /view a\.jpg/i }))
    const stage = screen.getByRole('dialog').querySelector('[data-backdrop]')!.parentElement!

    swipe(stage, 200, 180)
    swipe(stage, 200, 100, 100, 400)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })
})

describe('load more', () => {
  it('renders in pages and reveals the rest on demand', () => {
    const many = Array.from({ length: 60 }, (_, i) => makeMedia(`m${i}`, `p${i}.jpg`))
    render(<ClientGalleryContent gallery={makeGallery({ media_count: 60, media: many }) as never} token="tok-1" />)
    expect(screen.getAllByRole('button', { name: /^view p/i })).toHaveLength(48)
    fireEvent.click(screen.getByRole('button', { name: /show 12 more/i }))
    expect(screen.getAllByRole('button', { name: /^view p/i })).toHaveLength(60)
  })
})

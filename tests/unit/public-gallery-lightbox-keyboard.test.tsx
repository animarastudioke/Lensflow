import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

// Phase 11 Step 13: the public gallery lightbox was previously mouse-only --
// opening a photo, closing the lightbox, and navigating between photos all
// depended on a click; there was no Escape/arrow-key handling, no keyboard
// path into the grid at all (plain <div onClick>), and no focus management
// (nothing moved focus into the dialog on open or back to the grid on
// close). This is the identified accessibility regression from the earlier
// Phase 11 audit. These tests prove the fix using real keyboard events, not
// direct function calls.

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const { ClientGalleryContent } = await import('@/app/g/[token]/ClientGalleryContent')

function makeMedia(id: string, filename: string) {
  return {
    id,
    filename,
    url: `https://cdn.example/${id}-preview.webp`,
    thumbnail_url: `https://cdn.example/${id}-thumb.webp`,
    type: 'image' as const,
    size: 1000,
    width: 800,
    height: 600,
    is_favorite: false,
    comment_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    album_id: null,
  }
}

function makeGallery(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'gallery-1',
    studio_id: 'studio-1',
    name: 'Smith Wedding',
    type: 'wedding' as const,
    media_count: 2,
    allow_download: true,
    allow_comments: true,
    allow_favorites: true,
    watermark_enabled: false,
    password_protected: false,
    share_token: 'tok-1',
    layout_type: 'grid' as const,
    cover_template: 'novel' as const,
    media: [makeMedia('media-1', 'photo-1.jpg'), makeMedia('media-2', 'photo-2.jpg')],
    studio: { name: 'Test Studio', slug: 'test-studio' },
    ...overrides,
  }
}

describe('Public gallery grid: keyboard-operable, not mouse-only', () => {
  it('a grid item is a real tab stop and Enter opens the lightbox', () => {
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    const item = screen.getByRole('button', { name: /view photo-1\.jpg/i })
    expect(item).toHaveAttribute('tabIndex', '0')

    fireEvent.keyDown(item, { key: 'Enter' })
    expect(screen.getByRole('dialog', { name: 'Image preview' })).toBeInTheDocument()
  })

  it('Space also opens the lightbox', () => {
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    const item = screen.getByRole('button', { name: /view photo-1\.jpg/i })
    fireEvent.keyDown(item, { key: ' ' })
    expect(screen.getByRole('dialog', { name: 'Image preview' })).toBeInTheDocument()
  })
})

describe('Public gallery lightbox: keyboard navigation and closing', () => {
  it('Escape closes the lightbox', () => {
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    fireEvent.click(screen.getByRole('button', { name: /view photo-1\.jpg/i }))
    expect(screen.getByRole('dialog', { name: 'Image preview' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Image preview' })).not.toBeInTheDocument()
  })

  it('ArrowRight/ArrowLeft navigate between photos and wrap around', () => {
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    fireEvent.click(screen.getByRole('button', { name: /view photo-1\.jpg/i }))
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('restores focus to the grid item that opened it after closing', async () => {
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    const item = screen.getByRole('button', { name: /view photo-1\.jpg/i })
    item.focus()
    fireEvent.click(item)

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(item).toHaveFocus())
  })

  it('background scrolling is locked while the lightbox is open and restored on close', () => {
    render(<ClientGalleryContent gallery={makeGallery() as never} token="tok-1" />)
    fireEvent.click(screen.getByRole('button', { name: /view photo-1\.jpg/i }))
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

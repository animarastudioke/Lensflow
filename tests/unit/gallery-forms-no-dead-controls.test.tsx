import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Phase 11 Step 13 regression coverage: NewGalleryForm and EditGalleryForm
// both exposed "Allow clients to comment on photos" and "Watermark photos"
// checkboxes that persisted real allow_comments/watermark_enabled columns
// with no consumer anywhere on the client-facing gallery -- no commenting
// UI exists at all, and the upload pipeline never composites a watermark.
// Removed from both forms (see gallery-detail-settings.test.tsx for the
// matching GalleryDetail Settings-tab coverage).

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/actions/galleries', () => ({
  createGallery: vi.fn(),
  updateGallery: vi.fn(),
}))

const { NewGalleryForm } = await import('@/components/galleries/NewGalleryForm')
const { EditGalleryForm } = await import('@/components/galleries/EditGalleryForm')

describe('NewGalleryForm: no controls for non-functional flags', () => {
  it('does not render "Allow clients to comment on photos" or "Watermark photos"', () => {
    render(<NewGalleryForm studioSlug="test-studio" clients={[]} />)
    expect(screen.queryByText('Allow clients to comment on photos')).not.toBeInTheDocument()
    expect(screen.queryByText('Watermark photos')).not.toBeInTheDocument()
    // The one real, functional toggle in this card is preserved.
    expect(screen.getByText('Allow clients to favorite photos')).toBeInTheDocument()
  })
})

describe('EditGalleryForm: no controls for non-functional flags', () => {
  it('does not render "Allow clients to comment on photos" or "Watermark photos"', () => {
    render(
      <EditGalleryForm
        studioSlug="test-studio"
        clients={[]}
        initialValues={{
          id: 'gallery-1',
          name: 'Smith Wedding',
          description: '',
          type: 'wedding',
          shootDate: '',
          clientId: 'none',
          status: 'draft',
          passwordProtected: false,
          allowDownload: true,
          allowComments: false,
          allowFavorites: true,
          watermarkEnabled: true,
        }}
      />
    )
    expect(screen.queryByText('Allow clients to comment on photos')).not.toBeInTheDocument()
    expect(screen.queryByText('Watermark photos')).not.toBeInTheDocument()
    expect(screen.getByText('Allow clients to favorite photos')).toBeInTheDocument()
  })
})

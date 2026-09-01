import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

// Phase 11 Step 11 regression coverage: WebsiteEditor's page list previously
// deleted a page immediately on click, with no confirmation of any kind --
// the one destructive control in this file that had none, unlike the
// website-level delete (WebsiteList) which already used a Dialog. This
// proves page delete now goes through the shared ConfirmDialog like every
// other destructive action, and that the "Preview" control (previously
// nonexistent on this screen) is a real link to the new preview route
// rather than a dead button.

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const updateWebsiteSettingsMock = vi.fn()
const addWebsitePageMock = vi.fn()
const deleteWebsitePageMock = vi.fn()
const setPagePublishedMock = vi.fn()

vi.mock('@/lib/actions/websites', () => ({
  updateWebsiteSettings: (...args: unknown[]) => updateWebsiteSettingsMock(...args),
  addWebsitePage: (...args: unknown[]) => addWebsitePageMock(...args),
  deleteWebsitePage: (...args: unknown[]) => deleteWebsitePageMock(...args),
  setPagePublished: (...args: unknown[]) => setPagePublishedMock(...args),
}))

const { WebsiteEditor } = await import('@/components/website/WebsiteEditor')

const website = {
  id: 'website-1',
  studio_id: 'studio-1',
  name: 'My Studio Site',
  subdomain: 'my-studio',
  custom_domain: null,
  status: 'draft' as const,
  template: 'modern-minimal',
  template_name: 'Modern Minimal',
  theme: {},
  seo: {},
  ssl_enabled: true,
  password_protected: false,
  visits: 0,
  unique_visitors: 0,
  published_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  pages: [
    {
      id: 'page-1',
      website_id: 'website-1',
      name: 'Home',
      path: '/',
      is_published: false,
      content: {},
      order: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
}

describe('WebsiteEditor: page delete requires confirmation', () => {
  it('does not call deleteWebsitePage on a single click -- opens ConfirmDialog first', () => {
    render(<WebsiteEditor studioSlug="test-studio" website={website} />)
    const deleteButton = screen.getAllByRole('button').find((b) => b.className.includes('text-destructive'))!
    fireEvent.click(deleteButton)
    expect(deleteWebsitePageMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('calls the real deleteWebsitePage action only after confirming, then removes the page row', async () => {
    deleteWebsitePageMock.mockResolvedValue(undefined)
    render(<WebsiteEditor studioSlug="test-studio" website={website} />)

    const deleteButtons = screen.getAllByRole('button').filter((b) => b.className.includes('text-destructive'))
    fireEvent.click(deleteButtons[0]!)

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete page' }))

    await waitFor(() => expect(deleteWebsitePageMock).toHaveBeenCalledWith('page-1', 'website-1', 'test-studio'))
    await waitFor(() => expect(screen.queryByText('Home')).not.toBeInTheDocument())
  })
})

describe('WebsiteEditor: preview is a real link, not a dead button', () => {
  it('the page-row preview link points at the authenticated preview route for that page path', () => {
    render(<WebsiteEditor studioSlug="test-studio" website={website} />)
    const previewLink = screen.getByTitle('Preview')
    expect(previewLink.tagName).toBe('A')
    expect(previewLink).toHaveAttribute('href', '/dashboard/test-studio/website/website-1/preview')
  })

  it('the header Preview button links to the real preview route', () => {
    render(<WebsiteEditor studioSlug="test-studio" website={website} />)
    const previewLinks = screen.getAllByRole('link', { name: /preview/i })
    expect(previewLinks.length).toBeGreaterThan(0)
    for (const link of previewLinks) {
      expect(link).toHaveAttribute('href', '/dashboard/test-studio/website/website-1/preview')
    }
  })

  it('the page-row edit-content link points at the new per-page editor route', () => {
    render(<WebsiteEditor studioSlug="test-studio" website={website} />)
    const editLink = screen.getByTitle('Edit content')
    expect(editLink).toHaveAttribute('href', '/dashboard/test-studio/website/website-1/editor/pages/page-1')
  })
})

describe('WebsiteEditor: Save Changes calls the real Server Action', () => {
  it('calls updateWebsiteSettings and shows a real success toast', async () => {
    updateWebsiteSettingsMock.mockResolvedValue(undefined)
    render(<WebsiteEditor studioSlug="test-studio" website={website} />)
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(updateWebsiteSettingsMock).toHaveBeenCalled())
  })
})

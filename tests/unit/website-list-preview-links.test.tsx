import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

// Phase 11 Step 11 regression coverage: the earlier audit found the
// Website Builder's preview button had no href/onClick at all -- a plain
// disabled-by-status icon button with no link and no click handler. This
// proves the table-view preview icon is now a real link into the
// authenticated preview route, that the "view live site" link is only
// enabled for a genuinely published, non-password-protected site (real
// `/portfolio/[subdomain]` route), and that website deletion still goes
// through a real confirmation before calling the Server Action.

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const deleteWebsiteMock = vi.fn()
const bulkDeleteWebsitesMock = vi.fn()
vi.mock('@/lib/actions/websites', () => ({
  bulkDeleteWebsites: (...args: unknown[]) => bulkDeleteWebsitesMock(...args),
  bulkSetWebsiteStatus: vi.fn(),
  deleteWebsite: (...args: unknown[]) => deleteWebsiteMock(...args),
  duplicateWebsite: vi.fn(),
  setWebsiteStatus: vi.fn(),
}))

const { WebsiteList } = await import('@/components/website/WebsiteList')

function makeWebsite(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
      { id: 'page-1', website_id: 'website-1', name: 'Home', path: '/', is_published: true, content: {}, order: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ],
    ...overrides,
  }
}

describe('WebsiteList: preview is a real link, not a dead disabled button', () => {
  it('the preview icon links to the authenticated preview route regardless of publish status', () => {
    render(<WebsiteList studioSlug="test-studio" initialWebsites={[makeWebsite({ status: 'draft' })]} />)
    const previewLink = screen.getByTitle('Preview')
    expect(previewLink.tagName).toBe('A')
    expect(previewLink).not.toHaveAttribute('aria-disabled', 'true')
    expect(previewLink).toHaveAttribute('href', '/dashboard/test-studio/website/website-1/preview')
  })
})

describe('WebsiteList: "view live site" only enabled for a genuinely public site', () => {
  it('is a disabled button (not a link) for a draft website', () => {
    render(<WebsiteList studioSlug="test-studio" initialWebsites={[makeWebsite({ status: 'draft' })]} />)
    const liveButton = screen.getByTitle('Publish this site to make it live')
    expect(liveButton.tagName).toBe('BUTTON')
    expect(liveButton).toBeDisabled()
  })

  it('is a real link to /portfolio/[subdomain] for a published, non-password-protected website', () => {
    render(<WebsiteList studioSlug="test-studio" initialWebsites={[makeWebsite({ status: 'published' })]} />)
    const liveLink = screen.getByTitle('View live site')
    expect(liveLink.tagName).toBe('A')
    expect(liveLink).toHaveAttribute('href', '/portfolio/my-studio')
  })

  it('stays disabled for a published-but-password-protected website (no real password verification exists yet)', () => {
    render(<WebsiteList studioSlug="test-studio" initialWebsites={[makeWebsite({ status: 'published', password_protected: true })]} />)
    const liveButton = screen.getByTitle('Password protection is on, so this site is not publicly reachable yet')
    expect(liveButton.tagName).toBe('BUTTON')
    expect(liveButton).toBeDisabled()
  })
})

describe('WebsiteList: bulk delete requires confirmation before calling the Server Action', () => {
  // Single-row delete lives behind the row dropdown (Radix portal, not
  // reliably testable under jsdom -- see project-list precedent). Bulk
  // delete uses the identical ConfirmDialog + deleteWebsite/
  // bulkDeleteWebsites wiring via an always-rendered button instead.
  it('selecting a row and clicking Delete opens ConfirmDialog without calling bulkDeleteWebsites yet, then calls it only once confirmed', async () => {
    bulkDeleteWebsitesMock.mockResolvedValue(undefined)
    render(<WebsiteList studioSlug="test-studio" initialWebsites={[makeWebsite()]} />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select My Studio Site' }))
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    expect(bulkDeleteWebsitesMock).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(bulkDeleteWebsitesMock).toHaveBeenCalledWith(['website-1'], 'test-studio'))
    await waitFor(() => expect(screen.queryByText('My Studio Site')).not.toBeInTheDocument())
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

// The single-screen builder replaced two form screens (site settings, then a
// separate per-page editor). These tests pin the behaviour people rely on:
// edits show in the preview before saving, Publish never publishes stale
// content, destructive actions are confirmed, and server-side refusals (Home
// rule, sub-page rule) surface instead of silently changing local state.

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) } }))

const calls: string[] = []
const updateWebsiteSettingsMock = vi.fn()
const addWebsitePageMock = vi.fn()
const deleteWebsitePageMock = vi.fn()
const setPagePublishedMock = vi.fn()
const setWebsiteStatusMock = vi.fn()
const updateWebsitePageContentMock = vi.fn()
const renameWebsitePageMock = vi.fn()
const reorderWebsitePagesMock = vi.fn()

vi.mock('@/lib/actions/websites', () => ({
  updateWebsiteSettings: (...a: unknown[]) => { calls.push('settings'); return updateWebsiteSettingsMock(...a) },
  addWebsitePage: (...a: unknown[]) => addWebsitePageMock(...a),
  deleteWebsitePage: (...a: unknown[]) => deleteWebsitePageMock(...a),
  setPagePublished: (...a: unknown[]) => setPagePublishedMock(...a),
  setWebsiteStatus: (...a: unknown[]) => { calls.push('status'); return setWebsiteStatusMock(...a) },
  updateWebsitePageContent: (...a: unknown[]) => { calls.push('content'); return updateWebsitePageContentMock(...a) },
  renameWebsitePage: (...a: unknown[]) => renameWebsitePageMock(...a),
  reorderWebsitePages: (...a: unknown[]) => reorderWebsitePagesMock(...a),
}))

const { WebsiteBuilder } = await import('@/components/website/builder/WebsiteBuilder')
const { resolvePreviewClick } = await import('@/components/website/builder/PreviewFrame')

function page(id: string, name: string, path: string, order: number, heading = `${name} heading`, published = true) {
  return {
    id,
    website_id: 'website-1',
    name,
    path,
    is_published: published,
    content: { version: 1, sections: [{ id: `${id}-s1`, type: 'text', heading, body: '' }] },
    order,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function makeWebsite(overrides: Record<string, unknown> = {}) {
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
    studio: { name: 'My Studio', logo_url: null },
    pages: [
      page('home', 'Home', '/', 0, 'Welcome heading'),
      page('portfolio', 'Portfolio', '/portfolio', 1),
      page('about', 'About', '/about', 2),
    ],
    ...overrides,
  }
}

function renderBuilder(overrides: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
  return render(<WebsiteBuilder studioSlug="test-studio" website={makeWebsite(overrides)} galleries={[]} {...props} />)
}

const previewRegion = () => screen.getByRole('region', { name: 'Live preview of your website' })

beforeEach(() => {
  calls.length = 0
  for (const mock of [toastError, toastSuccess, updateWebsiteSettingsMock, addWebsitePageMock, deleteWebsitePageMock, setPagePublishedMock, setWebsiteStatusMock, updateWebsitePageContentMock, renameWebsitePageMock, reorderWebsitePagesMock]) mock.mockReset()
  updateWebsiteSettingsMock.mockResolvedValue(undefined)
  updateWebsitePageContentMock.mockResolvedValue(undefined)
  setWebsiteStatusMock.mockResolvedValue(undefined)
  setPagePublishedMock.mockResolvedValue(undefined)
  deleteWebsitePageMock.mockResolvedValue(undefined)
  renameWebsitePageMock.mockResolvedValue({ success: true })
  reorderWebsitePagesMock.mockResolvedValue({ success: true })
})

describe('WebsiteBuilder: layout', () => {
  it('shows the page list and a live preview of the Home page', () => {
    renderBuilder()
    const list = screen.getByRole('list', { name: 'Site menu' })
    expect(within(list).getByText('Home')).toBeInTheDocument()
    expect(within(list).getByText('Portfolio')).toBeInTheDocument()
    expect(within(previewRegion()).getByText('Welcome heading')).toBeInTheDocument()
  })

  it('opens a requested page straight into its editor', () => {
    renderBuilder({}, { initialPageId: 'about' })
    expect(screen.getByLabelText('Page name')).toHaveValue('About')
    expect(within(previewRegion()).getByText('About heading')).toBeInTheDocument()
  })

  it('ignores an unknown initial page id and falls back to Home', () => {
    renderBuilder({}, { initialPageId: 'nope' })
    expect(within(previewRegion()).getByText('Welcome heading')).toBeInTheDocument()
    expect(screen.queryByLabelText('Page name')).not.toBeInTheDocument()
  })

  it('links Preview to the saved preview route for the selected page', () => {
    renderBuilder()
    const link = screen.getByRole('link', { name: /preview/i })
    expect(link).toHaveAttribute('href', '/dashboard/test-studio/website/website-1/preview')
  })
})

describe('WebsiteBuilder: editing a page', () => {
  it('shows an edit in the preview before it is saved, and saves it through the real action', async () => {
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /^Portfolio/ }))
    fireEvent.change(screen.getByLabelText('Heading'), { target: { value: 'Our work' } })

    expect(within(previewRegion()).getByText('Our work')).toBeInTheDocument()
    expect(screen.getByText('Unsaved changes', { selector: 'span.rounded-full' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(updateWebsitePageContentMock).toHaveBeenCalledTimes(1))
    const formData = updateWebsitePageContentMock.mock.calls[0]![0] as FormData
    expect(formData.get('page_id')).toBe('portfolio')
    expect(formData.get('website_id')).toBe('website-1')
    expect(JSON.parse(String(formData.get('sections')))[0]).toMatchObject({ type: 'text', heading: 'Our work' })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled())
  })

  it('keeps edits unsaved and reports the reason when the server rejects the page', async () => {
    updateWebsitePageContentMock.mockResolvedValue({ error: 'Some section content is invalid. Review the fields and try again.' })
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /^Portfolio/ }))
    fireEvent.change(screen.getByLabelText('Heading'), { target: { value: 'Our work' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Some section content is invalid')))
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('refuses to save a page with every section removed', async () => {
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /^Portfolio/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Story section' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining('at least one section')))
    expect(updateWebsitePageContentMock).not.toHaveBeenCalled()
  })

  it('adds a section and reorders sections with the move buttons, live in the preview', () => {
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /^Portfolio/ }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Add a section' })).getByRole('button', { name: /Photo gallery/ }))
    const order = () => within(previewRegion()).getAllByRole('heading').map((h) => h.textContent).filter((t) => t === 'Portfolio heading' || t === 'Selected work')
    expect(order()).toEqual(['Portfolio heading', 'Selected work'])
    fireEvent.click(screen.getByRole('button', { name: 'Move Photo gallery section up' }))
    expect(order()).toEqual(['Selected work', 'Portfolio heading'])
  })
})

describe('WebsiteBuilder: publishing', () => {
  it('saves unsaved edits before it publishes', async () => {
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /^Portfolio/ }))
    fireEvent.change(screen.getByLabelText('Heading'), { target: { value: 'Our work' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(setWebsiteStatusMock).toHaveBeenCalledWith('website-1', 'published', 'test-studio'))
    expect(calls).toEqual(['content', 'status'])
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument()
  })

  it('does not publish when saving fails', async () => {
    updateWebsitePageContentMock.mockResolvedValue({ error: 'Failed to save page content' })
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /^Portfolio/ }))
    fireEvent.change(screen.getByLabelText('Heading'), { target: { value: 'Our work' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(setWebsiteStatusMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
  })

  it('shows the server reason and stays a draft when publishing is refused', async () => {
    setWebsiteStatusMock.mockResolvedValue({ error: 'Publish the Home page before publishing this website.' })
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Publish the Home page before publishing this website.'))
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
  })

  it('offers a live link only once the site is published', () => {
    const { unmount } = renderBuilder()
    expect(screen.queryByRole('link', { name: /view live/i })).not.toBeInTheDocument()
    unmount()
    renderBuilder({ status: 'published' })
    expect(screen.getByRole('link', { name: /view live/i })).toHaveAttribute('href', '/portfolio/my-studio')
  })
})

describe('WebsiteBuilder: page management', () => {
  it('adds a sub-page under a top-level page and nests it in the menu', async () => {
    addWebsitePageMock.mockImplementation(async (formData: FormData) => page('wedding', String(formData.get('name')), String(formData.get('path')), 3))
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /add page/i }))
    fireEvent.change(screen.getByLabelText('Page name'), { target: { value: 'Wedding' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'Place it' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Under Portfolio' }))
    expect(screen.getByText('/portfolio/wedding')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add page' }).at(-1)!)

    await waitFor(() => expect(addWebsitePageMock).toHaveBeenCalled())
    const formData = addWebsitePageMock.mock.calls[0]![0] as FormData
    expect(formData.get('path')).toBe('/portfolio/wedding')
    expect(formData.get('website_id')).toBe('website-1')
  })

  it('shows the server reason when a page cannot be added', async () => {
    addWebsitePageMock.mockRejectedValue(new Error('That page path already exists on this website.'))
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /add page/i }))
    fireEvent.change(screen.getByLabelText('Page name'), { target: { value: 'About' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Add page' }).at(-1)!)
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('That page path already exists on this website.'))
  })

  it('does not call deleteWebsitePage on a single click — it asks first, then deletes', async () => {
    renderBuilder({}, { initialPageId: 'about' })
    fireEvent.click(screen.getByRole('button', { name: /Delete .About./ }))
    expect(deleteWebsitePageMock).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete page' }))
    await waitFor(() => expect(deleteWebsitePageMock).toHaveBeenCalledWith('about', 'website-1', 'test-studio'))
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Site menu' })).queryByText('About')).not.toBeInTheDocument())
  })

  it('keeps a page and shows the reason when the server refuses to delete it', async () => {
    deleteWebsitePageMock.mockResolvedValue({ error: 'Delete or move its sub-pages first.' })
    renderBuilder({}, { initialPageId: 'portfolio' })
    fireEvent.click(screen.getByRole('button', { name: /Delete .Portfolio./ }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete page' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Delete or move its sub-pages first.'))
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /cancel/i }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /All pages/ }))
    expect(within(screen.getByRole('list', { name: 'Site menu' })).getByText('Portfolio')).toBeInTheDocument()
  })

  it('does not hide a page locally when the server refuses (Home rule)', async () => {
    setPagePublishedMock.mockResolvedValue({ error: 'Unpublish the website before hiding its Home page.' })
    renderBuilder({}, { initialPageId: 'home' })
    fireEvent.click(screen.getByRole('switch', { name: /show in the site/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Unpublish the website before hiding its Home page.'))
    expect(screen.getByRole('switch', { name: /show in the site/i })).toBeChecked()
  })

  it('renames a page on blur through the real action', async () => {
    renderBuilder({}, { initialPageId: 'about' })
    const input = screen.getByLabelText('Page name')
    fireEvent.change(input, { target: { value: 'About us' } })
    fireEvent.blur(input)
    await waitFor(() => expect(renameWebsitePageMock).toHaveBeenCalledWith('about', 'website-1', 'test-studio', 'About us'))
  })

  it('sends every page id, in order, when a page is moved, and reverts if the server refuses', async () => {
    reorderWebsitePagesMock.mockResolvedValue({ error: 'The page list is out of date. Reload and try again.' })
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: 'Move About up' }))
    await waitFor(() => expect(reorderWebsitePagesMock).toHaveBeenCalledWith('website-1', 'test-studio', ['home', 'about', 'portfolio']))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('The page list is out of date. Reload and try again.'))
    const labels = within(screen.getByRole('list', { name: 'Site menu' })).getAllByRole('button', { name: /^(Home|Portfolio|About)/ }).map((b) => b.textContent)
    expect(labels[1]).toContain('Portfolio')
  })

  it('keeps Home first and not movable', () => {
    renderBuilder()
    expect(screen.queryByRole('button', { name: 'Move Home up' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Portfolio up' })).toBeDisabled()
  })
})

describe('WebsiteBuilder: design and settings', () => {
  it('changes the preview style immediately and saves it through updateWebsiteSettings', async () => {
    renderBuilder()
    fireEvent.mouseDown(screen.getByRole('tab', { name: /design/i }), { button: 0 })
    fireEvent.click(screen.getByRole('radio', { name: /Elegant Wedding/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(updateWebsiteSettingsMock).toHaveBeenCalled())
    const formData = updateWebsiteSettingsMock.mock.calls[0]![0] as FormData
    expect(formData.get('template')).toBe('elegant-wedding')
    expect(formData.get('id')).toBe('website-1')
  })

  it('saves renamed site settings', async () => {
    renderBuilder()
    fireEvent.mouseDown(screen.getByRole('tab', { name: /settings/i }), { button: 0 })
    fireEvent.change(screen.getByLabelText('Website name'), { target: { value: 'Renamed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(updateWebsiteSettingsMock).toHaveBeenCalled())
    expect((updateWebsiteSettingsMock.mock.calls[0]![0] as FormData).get('name')).toBe('Renamed')
  })

  it('shows the error and stays dirty when settings fail to save', async () => {
    updateWebsiteSettingsMock.mockRejectedValue(new Error('Custom domains require an upgraded plan.'))
    renderBuilder()
    fireEvent.mouseDown(screen.getByRole('tab', { name: /settings/i }), { button: 0 })
    fireEvent.change(screen.getByLabelText('Custom domain'), { target: { value: 'www.example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Custom domains require an upgraded plan.'))
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })
})

describe('WebsiteBuilder: hiding a parent page', () => {
  const withSubPage = () => ({
    pages: [
      page('home', 'Home', '/', 0, 'Welcome heading'),
      page('portfolio', 'Portfolio', '/portfolio', 1),
      page('wedding', 'Wedding', '/portfolio/wedding', 2),
    ],
  })

  it('explains that sub-pages are hidden along with their parent', () => {
    renderBuilder({ pages: [withSubPage().pages[0], { ...withSubPage().pages[1], is_published: false }, withSubPage().pages[2]] }, { initialPageId: 'portfolio' })
    expect(screen.getByText('Hidden from visitors, along with its sub-pages.')).toBeInTheDocument()
  })

  it('says why a sub-page is hidden when only its parent is', () => {
    renderBuilder({ pages: [withSubPage().pages[0], { ...withSubPage().pages[1], is_published: false }, withSubPage().pages[2]] }, { initialPageId: 'wedding' })
    expect(screen.getByText('Hidden because “Portfolio” is hidden.')).toBeInTheDocument()
  })

  it('removes the parent and its sub-pages from the preview menu as soon as it is hidden', async () => {
    renderBuilder(withSubPage(), { initialPageId: 'portfolio' })
    const nav = () => within(previewRegion()).getByRole('navigation', { name: 'Website pages' })
    expect(within(nav()).getByRole('link', { name: 'Wedding' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: /show in the site/i }))
    await waitFor(() => expect(setPagePublishedMock).toHaveBeenCalledWith('portfolio', false, 'website-1', 'test-studio'))
    await waitFor(() => expect(within(previewRegion()).queryByRole('link', { name: 'Wedding' })).not.toBeInTheDocument())
    expect(within(previewRegion()).queryByRole('link', { name: 'Portfolio' })).not.toBeInTheDocument()
  })
})

describe('WebsiteBuilder: line-based section fields', () => {
  it('keeps the newline you type and saves the parsed packages', async () => {
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: /^Portfolio/ }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Add a section' })).getByRole('button', { name: /Pricing/ }))
    const field = await screen.findByLabelText('Packages')
    fireEvent.change(field, { target: { value: 'Essential — KES 45,000 — 4 hours\n' } })
    // A trailing blank line is not an item, but it must stay in the box so the next line can be typed.
    expect(field).toHaveValue('Essential — KES 45,000 — 4 hours\n')
    fireEvent.change(field, { target: { value: 'Essential — KES 45,000 — 4 hours\nSignature — KES 85,000 — Full day' } })
    expect(within(previewRegion()).getByText('KES 85,000')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(updateWebsitePageContentMock).toHaveBeenCalled())
    const sections = JSON.parse(String((updateWebsitePageContentMock.mock.calls[0]![0] as FormData).get('sections')))
    expect(sections.find((s: { type: string }) => s.type === 'pricing').items).toEqual([
      { name: 'Essential', price: 'KES 45,000', description: '4 hours' },
      { name: 'Signature', price: 'KES 85,000', description: 'Full day' },
    ])
  })
})

describe('WebsiteBuilder: links inside the preview', () => {
  it('switches the page instead of navigating when a preview nav link is clicked', () => {
    renderBuilder()
    const nav = within(previewRegion()).getByRole('navigation', { name: 'Website pages' })
    fireEvent.click(within(nav).getByRole('link', { name: 'About' }))
    expect(within(previewRegion()).getByText('About heading')).toBeInTheDocument()
  })
})

describe('resolvePreviewClick', () => {
  const base = '/dashboard/s/website/w/preview'
  it('maps page links back to page paths', () => {
    expect(resolvePreviewClick(base, base)).toEqual({ kind: 'page', path: '/' })
    expect(resolvePreviewClick(`${base}/portfolio/wedding`, base)).toEqual({ kind: 'page', path: '/portfolio/wedding' })
  })
  it('does not treat a sibling route with the same prefix as a page link', () => {
    expect(resolvePreviewClick(`${base}-old/x`, base)).toEqual({ kind: 'block' })
  })
  it('blocks mail, phone and other local links so the editor is never left', () => {
    expect(resolvePreviewClick('mailto:hi@example.com', base)).toEqual({ kind: 'block' })
    expect(resolvePreviewClick('tel:+254700000000', base)).toEqual({ kind: 'block' })
    expect(resolvePreviewClick('/contact', base)).toEqual({ kind: 'block' })
  })
  it('allows in-page anchors and external https links', () => {
    expect(resolvePreviewClick('#contact', base)).toEqual({ kind: 'allow' })
    expect(resolvePreviewClick('https://example.com', base)).toEqual({ kind: 'allow' })
  })
})

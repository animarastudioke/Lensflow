import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { WebsiteRenderer } from '@/components/website/WebsiteRenderer'

const page = { name: 'Wedding', content: { version: 1, sections: [{ id: 's1', type: 'text', heading: 'Weddings', body: '' }] } }

function renderNav(currentPath: string) {
  return render(
    <WebsiteRenderer
      studioName="Studio"
      websiteName="Studio"
      navPages={[
        { name: 'Home', path: '/' },
        { name: 'Portfolio', path: '/portfolio', children: [{ name: 'Wedding', path: '/portfolio/wedding' }, { name: 'Studio', path: '/portfolio/studio' }] },
        { name: 'Contact', path: '/contact' },
      ]}
      currentPath={currentPath}
      page={page}
      basePath="/portfolio/demo"
    />
  )
}

describe('WebsiteRenderer navigation with sub-pages', () => {
  it('lists sub-pages under their parent, linking to nested paths', () => {
    renderNav('/')
    const nav = screen.getByRole('navigation', { name: 'Website pages' })
    expect(within(nav).getByRole('link', { name: 'Portfolio' }).getAttribute('href')).toBe('/portfolio/demo/portfolio')
    expect(within(nav).getByRole('link', { name: 'Wedding' }).getAttribute('href')).toBe('/portfolio/demo/portfolio/wedding')
    expect(within(nav).getByRole('link', { name: 'Studio' }).getAttribute('href')).toBe('/portfolio/demo/portfolio/studio')
  })

  it('marks only the open sub-page as the current page, while its parent reads as active', () => {
    renderNav('/portfolio/wedding')
    const nav = screen.getByRole('navigation', { name: 'Website pages' })
    expect(within(nav).getByRole('link', { name: 'Wedding' }).getAttribute('aria-current')).toBe('page')
    expect(within(nav).getByRole('link', { name: 'Portfolio' }).getAttribute('aria-current')).toBeNull()
    expect(within(nav).getByRole('link', { name: 'Portfolio' }).className).toContain('font-medium')
  })

  it('renders a flat nav unchanged when no page has sub-pages', () => {
    render(
      <WebsiteRenderer studioName="S" websiteName="S" navPages={[{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }]} currentPath="/about" page={page} basePath="/portfolio/demo" />
    )
    const nav = screen.getByRole('navigation', { name: 'Website pages' })
    expect(within(nav).queryAllByRole('list')).toHaveLength(0)
    expect(within(nav).getByRole('link', { name: 'About' }).getAttribute('aria-current')).toBe('page')
  })
})

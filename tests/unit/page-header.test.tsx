import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '@/components/layout/PageHeader'

describe('PageHeader', () => {
  it('renders the title as an h1 and the description as muted text', () => {
    render(<PageHeader title="Invoices" description="Manage invoices and client payments." />)
    const heading = screen.getByRole('heading', { level: 1, name: 'Invoices' })
    expect(heading).toBeInTheDocument()
    expect(heading.className).toContain('text-display-sm')
    expect(screen.getByText('Manage invoices and client payments.')).toBeInTheDocument()
  })

  it('renders actions and a back link when provided', () => {
    render(
      <PageHeader
        title="Gallery"
        backHref="/dashboard/studio/galleries"
        actions={<button>New invoice</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'New invoice' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/dashboard/studio/galleries')
  })

  it('renders breadcrumbs as links except the current (last) page', () => {
    render(
      <PageHeader
        title="Wedding Gallery"
        breadcrumbs={[
          { label: 'Galleries', href: '/dashboard/studio/galleries' },
          { label: 'Wedding Gallery' },
        ]}
      />
    )
    const link = screen.getByRole('link', { name: 'Galleries' })
    expect(link).toHaveAttribute('href', '/dashboard/studio/galleries')
    // The current page renders as non-navigable: no href, aria-current="page".
    const currentPage = screen.getByText('Wedding Gallery', { selector: '[aria-current="page"]' })
    expect(currentPage).not.toHaveAttribute('href')
    expect(currentPage).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders an eyebrow above the title when provided', () => {
    render(<PageHeader title="Settings" eyebrow="Studio" />)
    expect(screen.getByText('Studio')).toBeInTheDocument()
  })
})

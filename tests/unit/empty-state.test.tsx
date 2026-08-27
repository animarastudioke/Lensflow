import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Image as ImageIcon } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'

describe('EmptyState', () => {
  it('renders title, description, and icon', () => {
    render(<EmptyState icon={ImageIcon} title="No galleries yet" description="Create your first gallery." />)
    expect(screen.getByText('No galleries yet')).toBeInTheDocument()
    expect(screen.getByText('Create your first gallery.')).toBeInTheDocument()
  })

  it('fires the primary action onClick when clicked', () => {
    const onClick = vi.fn()
    render(<EmptyState title="No clients yet" action={{ label: 'Add client', onClick }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add client' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders an href-based action as a link, not a button', () => {
    render(<EmptyState title="No invoices yet" action={{ label: 'Create invoice', href: '/dashboard/studio/invoices/new' }} />)
    const link = screen.getByRole('link', { name: 'Create invoice' })
    expect(link).toHaveAttribute('href', '/dashboard/studio/invoices/new')
  })

  it('renders both a primary and secondary action', () => {
    render(
      <EmptyState
        title="No bookings yet"
        action={{ label: 'New booking', onClick: vi.fn() }}
        secondaryAction={{ label: 'Import', onClick: vi.fn() }}
      />
    )
    expect(screen.getByRole('button', { name: 'New booking' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
  })

  it('compact mode uses smaller text sizing than the default full view', () => {
    const { unmount } = render(<EmptyState title="No results" compact />)
    expect(screen.getByText('No results').className).toContain('text-body-sm')
    unmount()
    render(<EmptyState title="No results" />)
    expect(screen.getByText('No results').className).toContain('text-heading-sm')
  })
})

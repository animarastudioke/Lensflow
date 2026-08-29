import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BillingDocumentView } from '@/components/billing/BillingDocumentView'

// Phase 11 Step 12 regression coverage: the previous audit found Balance
// Due buried as the final, same-weight row in the small totals table --
// no more prominent than Total, no semantic color, easy to miss. This
// proves it now renders as its own distinct, prominently-styled block
// (destructive when money is owed, success when paid in full), separate
// from the Subtotal/Tax/Total breakdown table, and that the status pill
// now goes through the shared StatusBadge rather than a plain generic pill.

const baseDoc = {
  kind: 'Invoice' as const,
  documentNumber: 'INV-001',
  statusLabel: 'overdue',
  issueDate: '2026-08-01',
  secondaryDateLabel: 'Due',
  secondaryDate: '2026-09-01',
  currency: 'KES',
  items: [{ id: 'item-1', description: 'Wedding photography', quantity: 1, unitPrice: 85000, total: 85000 }],
  subtotal: 85000,
  tax: 0,
  discount: 0,
  total: 85000,
  notes: null,
  client: { name: 'Jane Doe', email: 'jane@example.com' },
  studio: { name: 'Test Studio', logoUrl: null, brandColor: null, email: null, phone: null, address: null },
}

describe('BillingDocumentView: Balance Due is a prominent, distinct element', () => {
  it('renders Balance Due as its own labeled block with a large, semantic-colored amount', () => {
    render(<BillingDocumentView {...baseDoc} amountPaid={0} balanceDue={85000} />)
    const label = screen.getByText('Balance due')
    const amount = screen.getAllByText(/KES/).find((el) => el.className.includes('text-3xl'))
    expect(label).toBeInTheDocument()
    expect(amount).toBeDefined()
    expect(amount!.className).toMatch(/text-destructive/)
  })

  it('shows the due date alongside an outstanding balance', () => {
    render(<BillingDocumentView {...baseDoc} amountPaid={0} balanceDue={85000} />)
    expect(screen.getByText(/Due.*Sep 1, 2026/)).toBeInTheDocument()
  })

  it('renders in a success tone and "Paid in full" once the balance reaches zero', () => {
    render(<BillingDocumentView {...baseDoc} amountPaid={85000} balanceDue={0} />)
    expect(screen.getByText('Paid in full')).toBeInTheDocument()
    const amount = screen.getAllByText(/KES/).find((el) => el.className.includes('text-3xl'))
    expect(amount?.className).toMatch(/text-success/)
  })

  it('does not render a Balance Due block for a Quote (balanceDue undefined)', () => {
    render(<BillingDocumentView {...baseDoc} kind="Quote" statusLabel="sent" />)
    expect(screen.queryByText('Balance due')).not.toBeInTheDocument()
  })

  it('the small totals table no longer repeats a Balance Due row', () => {
    render(<BillingDocumentView {...baseDoc} amountPaid={0} balanceDue={85000} />)
    expect(screen.getAllByText('Balance due')).toHaveLength(1)
  })
})

describe('BillingDocumentView: status renders through the shared StatusBadge', () => {
  it('an overdue invoice status pill is destructive-toned, not a plain generic pill', () => {
    render(<BillingDocumentView {...baseDoc} amountPaid={0} balanceDue={85000} />)
    const badge = screen.getByText('Overdue')
    expect(badge.className).toMatch(/destructive/)
  })
})

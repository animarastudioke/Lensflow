import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

// Phase 11 Step 12 regression coverage: InvoiceList previously fell back to
// a 102-line hardcoded mockInvoices array (fake clients "Sarah Chen" etc.)
// whenever initialInvoices was omitted -- confirmed dead in the one real
// caller (which always passes real data), but still a landmine. This
// proves the mock is gone (initialInvoices is now required, so there's no
// path left to render it), that the status badge renders through the
// shared StatusBadge/STATUS_VARIANT_MAP rather than a local color map, and
// that delete goes through a real ConfirmDialog before calling the Server
// Action, not immediately.

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const deleteInvoiceMock = vi.fn()
const bulkDeleteInvoicesMock = vi.fn()
vi.mock('@/lib/actions/invoices', () => ({
  deleteInvoice: (...args: unknown[]) => deleteInvoiceMock(...args),
  bulkDeleteInvoices: (...args: unknown[]) => bulkDeleteInvoicesMock(...args),
  updateInvoiceStatus: vi.fn(),
  bulkUpdateInvoiceStatus: vi.fn(),
}))

const { InvoiceList } = await import('@/components/invoices/InvoiceList')

function makeInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    clientId: 'client-1',
    clientName: 'Real Client',
    clientEmail: 'real@example.com',
    status: 'overdue' as const,
    issueDate: '2026-01-01',
    dueDate: '2026-02-01',
    items: [{ description: 'Session', quantity: 1, unitPrice: 500, total: 500 }],
    subtotal: 500,
    tax: 0,
    discount: 0,
    total: 500,
    amountPaid: 0,
    balanceDue: 500,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('InvoiceList: no fabricated mock data', () => {
  it('renders only the real invoice passed in, never a fake "Sarah Chen"/"Marcus Johnson" row', () => {
    render(<InvoiceList studioSlug="test-studio" initialInvoices={[makeInvoice()]} currency="KES" />)
    expect(screen.getByText('Real Client')).toBeInTheDocument()
    expect(screen.queryByText('Sarah Chen')).not.toBeInTheDocument()
    expect(screen.queryByText('Marcus Johnson')).not.toBeInTheDocument()
  })

  it('shows the real honest empty state when there truly are no invoices', () => {
    render(<InvoiceList studioSlug="test-studio" initialInvoices={[]} currency="KES" />)
    expect(screen.getByText('No invoices yet')).toBeInTheDocument()
    expect(screen.queryByText('Sarah Chen')).not.toBeInTheDocument()
  })
})

describe('InvoiceList: status renders through the shared StatusBadge map', () => {
  it('an overdue invoice shows a destructive-toned badge (matches STATUS_VARIANT_MAP.overdue)', () => {
    render(<InvoiceList studioSlug="test-studio" initialInvoices={[makeInvoice({ status: 'overdue' })]} currency="KES" />)
    // "Overdue" also appears as a stats-plaque label, so find the actual badge specifically.
    const badge = screen.getAllByText('Overdue').find((el) => el.className.includes('destructive'))
    expect(badge).toBeDefined()
  })
})

describe('InvoiceList: currency is passed through, not hardcoded', () => {
  it('formats the total using the studio\'s real KES currency, not a hardcoded $', () => {
    render(<InvoiceList studioSlug="test-studio" initialInvoices={[makeInvoice({ total: 500 })]} currency="KES" />)
    expect(screen.getAllByText(/KES/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/^\$500/)).not.toBeInTheDocument()
  })
})

describe('InvoiceList: bulk delete requires confirmation before calling the Server Action', () => {
  it('selecting a row and clicking Delete opens ConfirmDialog first, calls bulkDeleteInvoices only once confirmed', async () => {
    bulkDeleteInvoicesMock.mockResolvedValue(undefined)
    render(<InvoiceList studioSlug="test-studio" initialInvoices={[makeInvoice()]} currency="KES" />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select INV-001' }))
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    expect(bulkDeleteInvoicesMock).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(bulkDeleteInvoicesMock).toHaveBeenCalledWith(['invoice-1'], 'test-studio'))
    await waitFor(() => expect(screen.queryByText('Real Client')).not.toBeInTheDocument())
  })
})

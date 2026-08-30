import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Phase 11 Step 14: UI-level companion to the server-side guard in
// tests/unit/invoice-status-integrity.test.ts. Paid/Partial must not be
// freely selectable from either form's status dropdown -- the only
// legitimate paths into those statuses are a real M-Pesa payment or the
// dedicated Mark-as-paid action. The server-side rejection is the real
// security boundary (proven separately); this only proves the UI doesn't
// invite a studio user into a request the server will just reject.

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/actions/invoices', () => ({ createInvoice: vi.fn(), updateInvoice: vi.fn() }))

const { NewInvoiceForm } = await import('@/components/invoices/NewInvoiceForm')
const { EditInvoiceForm } = await import('@/components/invoices/EditInvoiceForm')

async function openStatusSelect() {
  const user = userEvent.setup()
  const trigger = screen.getAllByRole('combobox')[1]!
  await user.click(trigger)
  return user
}

describe('NewInvoiceForm: Paid/Partial are not selectable at creation', () => {
  it('Paid and Partial render disabled; Sent (a real, immediately-reachable status) does not', async () => {
    render(<NewInvoiceForm studioSlug="test-studio" clients={[]} currency="KES" />)
    await openStatusSelect()

    expect(await screen.findByRole('option', { name: 'Paid' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('option', { name: 'Partial' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('option', { name: 'Sent' })).not.toHaveAttribute('aria-disabled', 'true')
  })
})

describe('EditInvoiceForm: Paid/Partial are only selectable if already the invoice\'s current status', () => {
  const baseInitialValues = {
    id: 'invoice-1',
    clientId: 'none',
    issueDate: '2026-01-01',
    dueDate: '2026-02-01',
    tax: 0,
    discount: 0,
    notes: '',
    items: [{ description: 'Session', quantity: 1, unit_price: 500 }],
  }

  it('a draft invoice cannot be switched to Paid or Partial from this form', async () => {
    render(
      <EditInvoiceForm
        studioSlug="test-studio"
        clients={[]}
        currency="KES"
        initialValues={{ ...baseInitialValues, status: 'draft' }}
      />
    )
    await openStatusSelect()

    expect(await screen.findByRole('option', { name: 'Paid' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('option', { name: 'Partial' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('an already-paid invoice keeps Paid selectable (so it stays editable/re-selectable), but Partial stays disabled', async () => {
    render(
      <EditInvoiceForm
        studioSlug="test-studio"
        clients={[]}
        currency="KES"
        initialValues={{ ...baseInitialValues, status: 'paid' }}
      />
    )
    await openStatusSelect()

    expect(await screen.findByRole('option', { name: 'Paid' })).not.toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('option', { name: 'Partial' })).toHaveAttribute('aria-disabled', 'true')
  })
})

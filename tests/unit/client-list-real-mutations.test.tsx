import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

// Phase 11 Step 9 regression coverage: ClientList's delete/bulk-delete
// already called the real deleteClient/bulkDeleteClients Server Actions
// before this step, but through a plain hand-rolled Dialog rather than the
// shared ConfirmDialog primitive. This proves the migration to
// ConfirmDialog didn't break the underlying mutation wiring, and that the
// dormant mockClients fallback is gone (no fixture data shows up when
// initialClients is empty).

const deleteClientMock = vi.fn()
const bulkDeleteClientsMock = vi.fn()
const setClientsStatusMock = vi.fn()

vi.mock('@/lib/actions/clients', () => ({
  deleteClient: (...args: unknown[]) => deleteClientMock(...args),
  bulkDeleteClients: (...args: unknown[]) => bulkDeleteClientsMock(...args),
  setClientsStatus: (...args: unknown[]) => setClientsStatusMock(...args),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const { ClientList } = await import('@/components/clients/ClientList')

const client = {
  id: 'client-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  status: 'active' as const,
  tags: [],
  totalSpent: 0,
  totalOrders: 0,
  lastContact: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('ClientList: no fabricated fallback data', () => {
  it('shows the real empty state, not the dormant mock client fixtures, when initialClients is empty', () => {
    render(<ClientList studioSlug="test-studio" initialClients={[]} />)
    expect(screen.queryByText('Sarah Chen')).not.toBeInTheDocument()
    expect(screen.getByText(/no clients yet/i)).toBeInTheDocument()
  })
})

describe('ClientList: bulk delete calls the real Server Action through ConfirmDialog', () => {
  it('deletes only after bulkDeleteClients resolves without error, then removes the row', async () => {
    bulkDeleteClientsMock.mockResolvedValue(undefined)
    render(<ClientList studioSlug="test-studio" initialClients={[client]} />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Jane Doe' }))
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(bulkDeleteClientsMock).toHaveBeenCalledWith(['client-1'], 'test-studio'))
    await waitFor(() => expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument())
  })
})

describe('ClientList: bulk archive calls the real Server Action', () => {
  it('calling "Archive" updates status via setClientsStatus, not local-only state', async () => {
    setClientsStatusMock.mockResolvedValue(undefined)
    render(<ClientList studioSlug="test-studio" initialClients={[client]} />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Jane Doe' }))
    fireEvent.click(screen.getByRole('button', { name: /archive/i }))

    await waitFor(() => expect(setClientsStatusMock).toHaveBeenCalledWith(['client-1'], 'archived', 'test-studio'))
  })
})

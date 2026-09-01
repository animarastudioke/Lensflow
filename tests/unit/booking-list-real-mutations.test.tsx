import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

// Phase 11 Step 8 regression coverage: BookingList previously mutated only
// local React state on delete/bulk-delete/status-change -- clicking
// "Delete" removed the row from the array in memory but never called a
// Server Action, so the booking reappeared on next page load. This proves
// the bulk delete and bulk status-change controls now call the real
// deleteBooking/updateBookingStatus Server Actions and only update the
// visible list once the server call actually succeeds.

const deleteBookingMock = vi.fn()
const updateBookingStatusMock = vi.fn()

vi.mock('@/lib/actions/bookings', () => ({
  deleteBooking: (...args: unknown[]) => deleteBookingMock(...args),
  updateBookingStatus: (...args: unknown[]) => updateBookingStatusMock(...args),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const { BookingList } = await import('@/components/bookings/BookingList')

const booking = {
  id: 'booking-1',
  clientId: 'client-1',
  clientName: 'Jane Doe',
  clientEmail: 'jane@example.com',
  title: 'Doe Wedding',
  type: 'wedding' as const,
  status: 'inquiry' as const,
  startDateTime: '2026-06-01T10:00:00',
  endDateTime: '2026-06-01T12:00:00',
  location: 'Studio',
  totalPrice: 1000,
  depositPaid: 0,
  balanceDue: 1000,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function selectBooking() {
  fireEvent.click(screen.getByRole('checkbox', { name: `Select ${booking.title}` }))
}

describe('BookingList: bulk delete calls the real Server Action', () => {
  it('deletes only after deleteBooking resolves without error, then removes the row', async () => {
    deleteBookingMock.mockResolvedValue(undefined)
    render(<BookingList studioSlug="test-studio" initialBookings={[booking]} />)

    selectBooking()
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteBookingMock).toHaveBeenCalledWith('booking-1', 'test-studio'))
    await waitFor(() => expect(screen.queryByText('Doe Wedding')).not.toBeInTheDocument())
  })

  it('does not remove the row when deleteBooking returns an error', async () => {
    deleteBookingMock.mockResolvedValue({ error: 'Failed to delete booking' })
    render(<BookingList studioSlug="test-studio" initialBookings={[booking]} />)

    selectBooking()
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteBookingMock).toHaveBeenCalled())
    expect(screen.getByText('Doe Wedding')).toBeInTheDocument()
  })
})

describe('BookingList: bulk status change calls the real Server Action', () => {
  it('calling "Confirm" updates status via updateBookingStatus, not local-only state', async () => {
    updateBookingStatusMock.mockResolvedValue({ success: true })
    render(<BookingList studioSlug="test-studio" initialBookings={[booking]} />)

    selectBooking()
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => expect(updateBookingStatusMock).toHaveBeenCalledWith('booking-1', 'test-studio', 'confirmed'))
  })
})

describe('BookingList: empty state', () => {
  it('shows a real link to the working create-booking route when there are no bookings', () => {
    render(<BookingList studioSlug="test-studio" initialBookings={[]} />)
    // Both the PageHeader action and the EmptyState action point here when
    // the list is empty -- there is no fake href="#" link among them.
    const links = screen.getAllByRole('link', { name: 'New Booking' })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/dashboard/test-studio/bookings/new')
    }
  })
})

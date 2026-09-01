import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import DashboardLoading from '@/app/dashboard/(dashboard)/[studioSlug]/loading'
import DashboardError from '@/app/dashboard/(dashboard)/[studioSlug]/error'

describe('DashboardLoading', () => {
  it('renders a structured skeleton (page header, attention strip, stats, sections) rather than a bare spinner', () => {
    const { container } = render(<DashboardLoading />)
    // Mirrors the real page structure: a stats plaque with 4 cells, plus
    // the quick-actions and sidebar-card regions -- not one generic
    // centered spinner.
    const pulseElements = container.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(5)
  })
})

describe('DashboardError', () => {
  it('never renders the raw error message (avoids exposing internal failure details)', () => {
    const error = Object.assign(new Error('relation "studios" does not exist: connection to db@internal-host failed'), { digest: 'abc123' })
    render(<DashboardError error={error} reset={vi.fn()} />)
    expect(screen.queryByText(/relation "studios"/)).not.toBeInTheDocument()
    expect(screen.queryByText(/internal-host/)).not.toBeInTheDocument()
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument()
  })

  it('calls reset() when "Try again" is clicked', () => {
    const reset = vi.fn()
    const error = Object.assign(new Error('boom'), { digest: 'x' })
    render(<DashboardError error={error} reset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge, STATUS_VARIANT_MAP } from '@/components/layout/StatusBadge'

// Phase 11 Step 6 regression coverage: "archived" previously rendered
// destructive (red) on ClientList but secondary (neutral gray) on every
// other entity (galleries, websites, products, projects) -- an
// accidental inconsistency this shared mapping now makes structurally
// impossible to reintroduce for any status this map covers.

describe('StatusBadge / STATUS_VARIANT_MAP', () => {
  it('archived is neutral (secondary), not destructive -- state, not entity type', () => {
    expect(STATUS_VARIANT_MAP.archived).toBe('secondary')
  })

  it('maps positive/completed states to success', () => {
    for (const status of ['active', 'published', 'paid', 'completed', 'delivered']) {
      expect(STATUS_VARIANT_MAP[status]).toBe('success')
    }
  })

  it('maps needs-attention states to warning', () => {
    for (const status of ['pending', 'overdue', 'processing']) {
      expect(STATUS_VARIANT_MAP[status]).toBe('warning')
    }
  })

  it('maps failure/stopped states to destructive', () => {
    for (const status of ['failed', 'cancelled', 'expired']) {
      expect(STATUS_VARIANT_MAP[status]).toBe('destructive')
    }
  })

  it('falls back to secondary for an unrecognized status rather than throwing', () => {
    render(<StatusBadge status="some-future-status" />)
    expect(screen.getByText('Some Future Status')).toBeInTheDocument()
  })

  it('title-cases a hyphenated status by default', () => {
    render(<StatusBadge status="in-progress" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('accepts an explicit label override', () => {
    render(<StatusBadge status="paid" label="Paid in full" />)
    expect(screen.getByText('Paid in full')).toBeInTheDocument()
  })

  it('is case-insensitive when matching the status map', () => {
    render(<StatusBadge status="ARCHIVED" />)
    // Still resolves via the lowercase map entry -- no separate "ARCHIVED" fallback path.
    expect(STATUS_VARIANT_MAP['archived']).toBe('secondary')
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 3: getQuoteByToken() previously ignored quotes.expires_at entirely —
// /quote/[token] and /api/quote/[token]/pdf both call only this function,
// so a fix here closes the gap for both surfaces at once rather than
// duplicating an expiry check in each route. Confirmed by inspection this
// was a real gap: the public page even labels expires_at "Expires" in the
// UI while the data fetch behind it never checked it.

const state: { quote: Record<string, unknown> | null } = { quote: null }

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: state.quote, error: state.quote ? null : { message: 'not found' } }),
        }),
      }),
    }),
  },
}))

const { getQuoteByToken } = await import('@/lib/actions/quotes')

function baseQuote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quote-1',
    studio_id: 'studio-1',
    client_id: 'client-1',
    quote_number: 'QUO-001',
    title: 'Wedding package',
    status: 'sent',
    issue_date: '2026-01-01',
    expires_at: null,
    subtotal: 100,
    tax: 0,
    discount: 0,
    total: 100,
    notes: null,
    share_token: 'tok123',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    client: { name: 'Client', email: 'client@example.com' },
    items: [],
    studio: { name: 'Studio', logo_url: null, brand_color: null, email: null, phone: null, address: null, currency: 'KES' },
    ...overrides,
  }
}

beforeEach(() => {
  state.quote = null
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getQuoteByToken: expiry enforcement', () => {
  it('a valid, unexpired quote resolves', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    state.quote = baseQuote({ expires_at: future })
    const result = await getQuoteByToken('tok123')
    expect(result).not.toBeNull()
    expect(result?.quote_number).toBe('QUO-001')
  })

  it('an expired quote is denied (fails closed)', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    state.quote = baseQuote({ expires_at: past })
    const result = await getQuoteByToken('tok123')
    expect(result).toBeNull()
  })

  it('a quote with no expires_at set keeps resolving indefinitely (preserved behavior)', async () => {
    state.quote = baseQuote({ expires_at: null })
    const result = await getQuoteByToken('tok123')
    expect(result).not.toBeNull()
  })

  it('a nonexistent token still resolves to null (unrelated to expiry)', async () => {
    state.quote = null
    const result = await getQuoteByToken('does-not-exist')
    expect(result).toBeNull()
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasPermission } from '@/lib/auth/permissions'

// Regression coverage for TASK 8 (financial RBAC): invoices/quotes/orders/
// products Server Actions previously only checked "does this user have an
// active studio membership", not their role — so a team_member or editor
// (who have no invoices:delete/invoices:manage_payments/quotes:delete/
// store:manage_orders/store:manage_products permission in the
// ROLE_PERMISSIONS matrix) could still mark invoices paid, delete invoices/
// quotes/orders, or mutate the store. requireStudioPermission() is the
// shared fix, wired into updateInvoiceStatus, bulkUpdateInvoiceStatus,
// deleteInvoice, bulkDeleteInvoices, updateQuoteStatus, deleteQuote,
// updateOrderStatus, deleteOrder, updateProduct, archiveProducts, and
// deleteProduct.

describe('ROLE_PERMISSIONS matrix: the exact permissions requireStudioPermission relies on', () => {
  it('team_member and editor cannot delete invoices or mark them paid', () => {
    for (const role of ['team_member', 'editor'] as const) {
      expect(hasPermission(role, 'invoices:delete')).toBe(false)
      expect(hasPermission(role, 'invoices:manage_payments')).toBe(false)
    }
  })

  it('photographer can update invoices but cannot delete them or mark them paid manually', () => {
    expect(hasPermission('photographer', 'invoices:update')).toBe(true)
    expect(hasPermission('photographer', 'invoices:delete')).toBe(false)
    expect(hasPermission('photographer', 'invoices:manage_payments')).toBe(false)
  })

  it('studio_owner and super_admin can delete invoices and mark them paid', () => {
    for (const role of ['studio_owner', 'super_admin'] as const) {
      expect(hasPermission(role, 'invoices:delete')).toBe(true)
      expect(hasPermission(role, 'invoices:manage_payments')).toBe(true)
    }
  })

  it('team_member, editor, and client cannot delete quotes', () => {
    for (const role of ['team_member', 'editor', 'client'] as const) {
      expect(hasPermission(role, 'quotes:delete')).toBe(false)
    }
  })

  it('team_member and editor cannot mutate orders or products', () => {
    for (const role of ['team_member', 'editor'] as const) {
      expect(hasPermission(role, 'store:manage_orders')).toBe(false)
      expect(hasPermission(role, 'store:manage_products')).toBe(false)
    }
  })

  it('photographer and studio_owner can mutate orders and products', () => {
    for (const role of ['photographer', 'studio_owner'] as const) {
      expect(hasPermission(role, 'store:manage_orders')).toBe(true)
      expect(hasPermission(role, 'store:manage_products')).toBe(true)
    }
  })
})

// --- requireStudioPermission() wiring itself, with a mocked Supabase client ---

const state: {
  user: { id: string } | null
  membership: { studio_id: string; role: string } | null
} = { user: null, membership: null }

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        single: async () => {
          if (table === 'studio_members') return { data: state.membership }
          return { data: null }
        },
      }
      return builder
    },
  }),
}))

const { requireStudioPermission } = await import('@/lib/auth/server')

afterEach(() => {
  state.user = null
  state.membership = null
})

describe('requireStudioPermission()', () => {
  it('denies an unauthenticated caller', async () => {
    const result = await requireStudioPermission('invoices:delete')
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('denies a caller with no active studio membership', async () => {
    state.user = { id: 'user-1' }
    state.membership = null
    const result = await requireStudioPermission('invoices:delete')
    expect(result).toEqual({ error: 'No active studio membership' })
  })

  it('denies a team_member trying to delete an invoice (ATTACK 11/12 scenario)', async () => {
    state.user = { id: 'user-1' }
    state.membership = { studio_id: 'studio-1', role: 'team_member' }
    const result = await requireStudioPermission('invoices:delete')
    expect('error' in result).toBe(true)
  })

  it('allows a studio_owner to delete an invoice', async () => {
    state.user = { id: 'user-1' }
    state.membership = { studio_id: 'studio-1', role: 'studio_owner' }
    const result = await requireStudioPermission('invoices:delete')
    expect(result).toEqual({ userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' })
  })

  it('denies a photographer marking an invoice paid but allows updating its status', async () => {
    state.user = { id: 'user-1' }
    state.membership = { studio_id: 'studio-1', role: 'photographer' }
    expect('error' in (await requireStudioPermission('invoices:manage_payments'))).toBe(true)
    expect('error' in (await requireStudioPermission('invoices:update'))).toBe(false)
  })
})

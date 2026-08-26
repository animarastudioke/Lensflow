import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 10 Target 5 regression coverage: createInvoice() and updateInvoice()
// previously performed no explicit application-layer permission check at
// all -- createInvoice used a raw auth.getUser() + hand-rolled membership
// lookup (any active member, any role), and updateInvoice used
// requireMembership() (same weak boundary). Both are now gated by
// requireStudioPermission('invoices:create'/'invoices:update'), matching
// the pattern every other invoice action in this file already uses
// (regenerateInvoiceShareToken, updateInvoiceStatus, deleteInvoice).
// This file proves the wiring without ever hitting a real database --
// the Supabase client is fully mocked.

const dbCalls: string[] = []

function makeBuilder(singleResult: unknown = { id: 'invoice-1' }): any {
  const builder: any = {}
  const record = (name: string) => (..._args: unknown[]) => {
    if (name === 'insert' || name === 'update') dbCalls.push(name)
    return builder
  }
  for (const method of ['select', 'insert', 'update', 'eq', 'single']) {
    if (method === 'single') continue
    builder[method] = record(method)
  }
  builder.single = async () => ({ data: singleResult, error: null })
  builder.count = 0
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: (table: string) => {
      if (table === 'invoices') return makeBuilder({ id: 'invoice-1' })
      if (table === 'invoice_items') return makeBuilder(null)
      return makeBuilder()
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: () => makeBuilder() } }))

vi.mock('@/lib/entitlements', () => ({
  requireEntitlement: vi.fn(async () => {}),
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/email/templates', () => ({ invoiceSentEmail: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

const { createInvoice, updateInvoice } = await import('@/lib/actions/invoices')

const DENIED = { error: 'You do not have permission to perform this action' }
const ALLOWED = { userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' as const }

function formDataWithItems(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('studio_slug', 'studio-slug')
  fd.set('items_json', JSON.stringify([{ description: 'Item', quantity: 1, unit_price: 100 }]))
  fd.set('status', 'draft')
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  dbCalls.length = 0
  requireStudioPermissionMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Phase 10 Target 5: createInvoice requests invoices:create', () => {
  it('requests invoices:create', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await createInvoice(formDataWithItems()).catch(() => {})
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('invoices:create')
  })

  it('denied: throws and never inserts (team_member/editor, lack invoices:create)', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    await expect(createInvoice(formDataWithItems())).rejects.toThrow(DENIED.error)
    expect(dbCalls).not.toContain('insert')
  })

  it('authorized: proceeds to insert the invoice', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    await createInvoice(formDataWithItems()).catch(() => {})
    expect(dbCalls).toContain('insert')
  })
})

describe('Phase 10 Target 5: updateInvoice requests invoices:update', () => {
  it('requests invoices:update', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    const fd = formDataWithItems({ id: 'invoice-1', status: 'draft' })
    await updateInvoice(fd).catch(() => {})
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('invoices:update')
  })

  it('denied: throws and never updates (team_member/editor, lack invoices:update)', async () => {
    requireStudioPermissionMock.mockResolvedValue(DENIED)
    const fd = formDataWithItems({ id: 'invoice-1', status: 'draft' })
    await expect(updateInvoice(fd)).rejects.toThrow(DENIED.error)
    expect(dbCalls).not.toContain('update')
  })

  it('authorized: proceeds to update the invoice', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    const fd = formDataWithItems({ id: 'invoice-1', status: 'draft' })
    await updateInvoice(fd).catch(() => {})
    expect(dbCalls).toContain('update')
  })
})

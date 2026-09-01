import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 2 P1 regression coverage: every mutation below previously checked
// only "does this caller have an active studio membership" (via a local,
// per-file requireMembership() helper) and never consulted the
// ROLE_PERMISSIONS matrix — so a team_member/editor could delete clients,
// contracts, websites, projects, expenses, questionnaire templates, create
// bookings/products, or change studio-wide settings despite having no
// corresponding permission. requireStudioPermission() is the shared fix.
//
// requireStudioPermission()'s own unauthenticated/no-membership/wrong-role/
// right-role semantics are already exhaustively covered in
// financial-rbac.test.ts. What matters here is the *wiring*: does each
// Server Action (a) call requireStudioPermission with the exact permission
// the action performs, and (b) actually stop — without touching the
// database — when that check is denied. Both are proven without needing a
// full functional simulation of every action's business logic, since in
// every hardened function requireStudioPermission() is the first thing
// called, before any FormData parsing or Supabase query.

const dbCalls: string[] = []

function makeBuilder(): any {
  const builder: any = {}
  const record = (name: string) => (..._args: unknown[]) => {
    if (name === 'insert' || name === 'update' || name === 'delete' || name === 'upsert') {
      dbCalls.push(name)
    }
    return builder
  }
  for (const method of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'or', 'not', 'gte', 'order', 'limit']) {
    builder[method] = record(method)
  }
  builder.single = async () => ({ data: null, error: null })
  builder.maybeSingle = async () => ({ data: null, error: null })
  // Several actions `await` a query directly after .eq()/.delete() without a
  // terminal .single() (e.g. `const { error } = await supabase.from(...).delete().eq(...)`)
  // — making the builder itself thenable lets that resolve like the real client would.
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null, count: 0 })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: () => makeBuilder(),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: () => makeBuilder() },
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/entitlements', () => ({
  requireEntitlement: vi.fn(async () => {}),
  hasEntitlement: vi.fn(async () => true),
}))

const DENIED = { error: 'You do not have permission to perform this action' }
const ALLOWED = { userId: 'user-1', studioId: 'studio-1', role: 'studio_owner' as const }

const clientsActions = await import('@/lib/actions/clients')
const contractsActions = await import('@/lib/actions/contracts')
const studiosActions = await import('@/lib/actions/studios')
const bookingsActions = await import('@/lib/actions/bookings')
const projectsActions = await import('@/lib/actions/projects')
const expensesActions = await import('@/lib/actions/expenses')
const questionnairesActions = await import('@/lib/actions/questionnaires')
const websitesActions = await import('@/lib/actions/websites')
const productsActions = await import('@/lib/actions/products')
const invoicesActions = await import('@/lib/actions/invoices')
const quotesActions = await import('@/lib/actions/quotes')

type Style = 'throw' | 'return'

interface Case {
  label: string
  permission: string
  style: Style
  invoke: () => Promise<unknown>
}

const cases: Case[] = [
  { label: 'clients.createClientRecord', permission: 'clients:create', style: 'throw', invoke: () => clientsActions.createClientRecord(new FormData()) },
  { label: 'clients.updateClient', permission: 'clients:update', style: 'throw', invoke: () => clientsActions.updateClient(new FormData()) },
  { label: 'clients.deleteClient', permission: 'clients:delete', style: 'return', invoke: () => clientsActions.deleteClient('client-1', 'studio-slug') },
  { label: 'clients.bulkDeleteClients', permission: 'clients:delete', style: 'return', invoke: () => clientsActions.bulkDeleteClients(['client-1'], 'studio-slug') },
  { label: 'clients.setClientsStatus', permission: 'clients:update', style: 'return', invoke: () => clientsActions.setClientsStatus(['client-1'], 'active', 'studio-slug') },

  { label: 'contracts.createContract', permission: 'contracts:create', style: 'throw', invoke: () => contractsActions.createContract(new FormData()) },
  { label: 'contracts.updateContract', permission: 'contracts:update', style: 'throw', invoke: () => contractsActions.updateContract(new FormData()) },
  { label: 'contracts.updateContractStatus', permission: 'contracts:update', style: 'return', invoke: () => contractsActions.updateContractStatus('contract-1', 'studio-slug', 'sent') },
  { label: 'contracts.deleteContract', permission: 'contracts:delete', style: 'return', invoke: () => contractsActions.deleteContract('contract-1', 'studio-slug') },

  { label: 'studios.updateStudioSettings', permission: 'settings:update', style: 'return', invoke: () => studiosActions.updateStudioSettings('studio-slug', new FormData()) },
  { label: 'studios.updateStudioBranding', permission: 'settings:update', style: 'return', invoke: () => studiosActions.updateStudioBranding('studio-slug', new FormData()) },
  { label: 'studios.uploadStudioLogo', permission: 'settings:update', style: 'return', invoke: () => studiosActions.uploadStudioLogo('studio-slug', new FormData()) },

  { label: 'bookings.createBooking', permission: 'bookings:create', style: 'throw', invoke: () => bookingsActions.createBooking(new FormData()) },
  { label: 'bookings.updateBooking', permission: 'bookings:update', style: 'throw', invoke: () => bookingsActions.updateBooking(new FormData()) },
  { label: 'bookings.deleteBooking', permission: 'bookings:delete', style: 'return', invoke: () => bookingsActions.deleteBooking('booking-1', 'studio-slug') },
  { label: 'bookings.updateBookingStatus', permission: 'bookings:update', style: 'return', invoke: () => bookingsActions.updateBookingStatus('booking-1', 'studio-slug', 'confirmed') },

  { label: 'projects.createProject', permission: 'projects:create', style: 'throw', invoke: () => projectsActions.createProject(new FormData()) },
  { label: 'projects.updateProject', permission: 'projects:update', style: 'throw', invoke: () => projectsActions.updateProject(new FormData()) },
  { label: 'projects.deleteProject', permission: 'projects:delete', style: 'return', invoke: () => projectsActions.deleteProject('project-1', 'studio-slug') },
  { label: 'projects.archiveProjects', permission: 'projects:delete', style: 'return', invoke: () => projectsActions.archiveProjects(['project-1'], 'studio-slug') },

  { label: 'expenses.createExpense', permission: 'expenses:create', style: 'return', invoke: () => expensesActions.createExpense('studio-slug', new FormData()) },
  { label: 'expenses.deleteExpense', permission: 'expenses:delete', style: 'return', invoke: () => expensesActions.deleteExpense('expense-1', 'studio-slug') },

  { label: 'questionnaires.createTemplate', permission: 'questionnaires:create', style: 'return', invoke: () => questionnairesActions.createTemplate('studio-slug', new FormData()) },
  { label: 'questionnaires.updateTemplateFields', permission: 'questionnaires:update', style: 'return', invoke: () => questionnairesActions.updateTemplateFields('template-1', 'studio-slug', []) },
  { label: 'questionnaires.deleteTemplate', permission: 'questionnaires:delete', style: 'return', invoke: () => questionnairesActions.deleteTemplate('template-1', 'studio-slug') },
  { label: 'questionnaires.sendQuestionnaire', permission: 'questionnaires:send', style: 'return', invoke: () => questionnairesActions.sendQuestionnaire('template-1', 'studio-slug', null) },

  { label: 'websites.createWebsite', permission: 'website:create', style: 'throw', invoke: () => websitesActions.createWebsite(new FormData()) },
  { label: 'websites.deleteWebsite', permission: 'website:delete', style: 'return', invoke: () => websitesActions.deleteWebsite('website-1', 'studio-slug') },
  { label: 'websites.bulkDeleteWebsites', permission: 'website:delete', style: 'return', invoke: () => websitesActions.bulkDeleteWebsites(['website-1'], 'studio-slug') },
  { label: 'websites.setWebsiteStatus', permission: 'website:publish', style: 'return', invoke: () => websitesActions.setWebsiteStatus('website-1', 'published', 'studio-slug') },
  { label: 'websites.bulkSetWebsiteStatus', permission: 'website:publish', style: 'return', invoke: () => websitesActions.bulkSetWebsiteStatus(['website-1'], 'published', 'studio-slug') },
  { label: 'websites.duplicateWebsite', permission: 'website:create', style: 'return', invoke: () => websitesActions.duplicateWebsite('website-1', 'studio-slug') },
  { label: 'websites.updateWebsiteSettings', permission: 'website:update', style: 'throw', invoke: () => websitesActions.updateWebsiteSettings(new FormData()) },
  { label: 'websites.addWebsitePage', permission: 'website:manage_pages', style: 'throw', invoke: () => websitesActions.addWebsitePage(new FormData()) },
  { label: 'websites.setPagePublished', permission: 'website:manage_pages', style: 'return', invoke: () => websitesActions.setPagePublished('page-1', true, 'website-1', 'studio-slug') },
  { label: 'websites.deleteWebsitePage', permission: 'website:manage_pages', style: 'return', invoke: () => websitesActions.deleteWebsitePage('page-1', 'website-1', 'studio-slug') },

  { label: 'products.createProduct', permission: 'store:manage_products', style: 'throw', invoke: () => productsActions.createProduct(new FormData()) },

  { label: 'invoices.regenerateInvoiceShareToken', permission: 'invoices:update', style: 'return', invoke: () => invoicesActions.regenerateInvoiceShareToken('invoice-1', 'studio-slug') },
  { label: 'quotes.regenerateQuoteShareToken', permission: 'quotes:update', style: 'return', invoke: () => quotesActions.regenerateQuoteShareToken('quote-1', 'studio-slug') },
]

beforeEach(() => {
  dbCalls.length = 0
  requireStudioPermissionMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Phase 2 P1: every hardened Server Action requests the correct permission', () => {
  for (const c of cases) {
    it(`${c.label} calls requireStudioPermission('${c.permission}')`, async () => {
      requireStudioPermissionMock.mockResolvedValue(ALLOWED)
      await c.invoke().catch(() => {
        // Business logic past the permission check may fail against the
        // generic mock (empty FormData, no matching rows) — irrelevant here;
        // only that the permission check itself ran, and with what argument.
      })
      expect(requireStudioPermissionMock).toHaveBeenCalledWith(c.permission)
    })
  }
})

describe('Phase 2 P1: denial blocks the mutation before any database write (UNAUTHORIZED / CROSS-STUDIO / UNAUTHENTICATED)', () => {
  for (const c of cases) {
    it(`${c.label} rejects and performs no insert/update/delete when denied`, async () => {
      requireStudioPermissionMock.mockResolvedValue(DENIED)

      if (c.style === 'throw') {
        await expect(c.invoke()).rejects.toThrow(DENIED.error)
      } else {
        await expect(c.invoke()).resolves.toEqual(DENIED)
      }

      expect(dbCalls).toEqual([])
    })
  }
})

describe('Phase 2 P1: AUTHORIZED ROLE succeeds past the permission gate', () => {
  it('clients.deleteClient proceeds to the database once permitted', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    const result = await clientsActions.deleteClient('client-1', 'studio-slug')
    expect(result).toBeUndefined() // no error surfaced — the delete went through the mock builder
    expect(dbCalls).toContain('delete')
  })

  it('websites.setWebsiteStatus proceeds to the database once permitted', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    const result = await websitesActions.setWebsiteStatus('website-1', 'draft', 'studio-slug')
    expect(result).toBeUndefined()
    expect(dbCalls).toContain('update')
  })

  it('projects.archiveProjects proceeds to the database once permitted', async () => {
    requireStudioPermissionMock.mockResolvedValue(ALLOWED)
    const result = await projectsActions.archiveProjects(['project-1'], 'studio-slug')
    expect(result).toBeUndefined()
    expect(dbCalls).toContain('update')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 11 Step 9 investigation: createBooking/updateBooking, createProject/
// updateProject, and createInvoice/updateInvoice all accepted a client_id
// (and projects also a booking_id) validated only as "is this a well-formed
// UUID" -- never that it belongs to the caller's own studio. A Postgres
// foreign key only requires the referenced row to exist *somewhere*, not
// that it belongs to the same tenant, so nothing at the database layer
// stopped a caller from linking their own studio's booking/project/invoice
// to another studio's client or booking.
//
// This was confirmed live-exploitable, not just a data-integrity smell:
// invoices.ts's sendInvoiceSentEmail() resolves the linked client via the
// *service-role* client (bypassing RLS) to get a name/email to send to --
// so creating an invoice with a foreign client_id and status 'sent' would
// dispatch a real branded email to a third party the acting studio has no
// relationship with. clientBelongsToStudio()/bookingBelongsToStudio() close
// this at the single point every one of these mutations already funnels
// through (the validated FormData), rather than patching each read site.

const STUDIO_A = 'studio-a'
const STUDIO_B = 'studio-b'
// zod validates these as z.string().uuid() before the guard ever runs, so
// they have to be well-formed UUIDs, not readable slugs.
const CLIENT_IN_A = '11111111-1111-4111-8111-111111111111'
const CLIENT_IN_B = '22222222-2222-4222-8222-222222222222'
const BOOKING_IN_A = '33333333-3333-4333-8333-333333333333'
const BOOKING_IN_B = '44444444-4444-4444-8444-444444444444'
const PROJECT_IN_A = '55555555-5555-4555-8555-555555555555'
const PROJECT_IN_B = '66666666-6666-4666-8666-666666666666'

function makeBuilder(table: string): any {
  const builder: any = {}
  const eqCalls: Record<string, unknown> = {}
  builder.select = () => builder
  builder.insert = () => builder
  builder.update = () => builder
  builder.delete = () => builder
  builder.eq = (col: string, val: unknown) => { eqCalls[col] = val; return builder }
  builder.order = () => builder
  builder.limit = () => builder
  builder.single = async () => {
    if (table === 'clients') {
      const id = eqCalls['id']
      const studioId = eqCalls['studio_id']
      if (id === CLIENT_IN_A && studioId === STUDIO_A) return { data: { id }, error: null }
      if (id === CLIENT_IN_B && studioId === STUDIO_B) return { data: { id }, error: null }
      return { data: null, error: null }
    }
    if (table === 'bookings') {
      const id = eqCalls['id']
      const studioId = eqCalls['studio_id']
      if (id === BOOKING_IN_A && studioId === STUDIO_A) return { data: { id }, error: null }
      if (id === BOOKING_IN_B && studioId === STUDIO_B) return { data: { id }, error: null }
      return { data: null, error: null }
    }
    if (table === 'projects') {
      const id = eqCalls['id']
      const studioId = eqCalls['studio_id']
      if (id === PROJECT_IN_A && studioId === STUDIO_A) return { data: { id }, error: null }
      if (id === PROJECT_IN_B && studioId === STUDIO_B) return { data: { id }, error: null }
      // createProject's own .insert({...}).select('id').single() isn't
      // filtered by id at all (nothing to filter an insert by) -- only
      // projectBelongsToStudio's lookup ever sets eqCalls['id'].
      if (id === undefined) return { data: { id: 'generic-id' }, error: null }
      return { data: null, error: null }
    }
    if (table === 'studio_members') {
      // quotes.ts's own requireMembership() (createQuote/updateQuote don't
      // use requireStudioPermission) -- every test in this file acts as a
      // studio A member.
      return { data: { studio_id: STUDIO_A, role: 'studio_owner' }, error: null }
    }
    // Every other table (studios, invoices, invoice_items, projects,
    // contracts, contract_signers, quotes, quote_items,
    // questionnaire_templates, questionnaire_responses) -- generic
    // success, irrelevant to what this file is verifying.
    return { data: { id: 'generic-id' }, error: null }
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null, count: 0 })
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => makeBuilder(table),
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (table: string) => makeBuilder(table) },
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  requireStudioPermission: (...args: unknown[]) => requireStudioPermissionMock(...args),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) }),
}))
vi.mock('@/lib/entitlements', () => ({
  requireEntitlement: vi.fn(async () => {}),
  hasEntitlement: vi.fn(async () => true),
}))
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/email/templates', () => ({
  bookingConfirmationEmail: vi.fn(() => ({ subject: '', html: '' })),
  invoiceSentEmail: vi.fn(() => ({ subject: '', html: '' })),
  quoteSentEmail: vi.fn(() => ({ subject: '', html: '' })),
}))
vi.mock('@/lib/actions/notifications', () => ({ createNotification: vi.fn(async () => {}) }))

const bookingsActions = await import('@/lib/actions/bookings')
const projectsActions = await import('@/lib/actions/projects')
const invoicesActions = await import('@/lib/actions/invoices')
const quotesActions = await import('@/lib/actions/quotes')
const contractsActions = await import('@/lib/actions/contracts')
const questionnairesActions = await import('@/lib/actions/questionnaires')
const expensesActions = await import('@/lib/actions/expenses')
const tasksActions = await import('@/lib/actions/tasks')

const ALLOWED_A = { userId: 'user-1', studioId: STUDIO_A, role: 'studio_owner' as const }

beforeEach(() => {
  requireStudioPermissionMock.mockReset()
  requireStudioPermissionMock.mockResolvedValue(ALLOWED_A)
})

afterEach(() => {
  vi.clearAllMocks()
})

function bookingFormData(clientId: string): FormData {
  const fd = new FormData()
  fd.set('id', BOOKING_IN_A)
  fd.set('studio_slug', 'studio-a-slug')
  fd.set('session_name', 'Test Session')
  fd.set('type', 'wedding')
  fd.set('status', 'inquiry')
  fd.set('client_id', clientId)
  return fd
}

function projectFormData(overrides: { clientId?: string; bookingId?: string }): FormData {
  const fd = new FormData()
  fd.set('id', 'project-1')
  fd.set('studio_slug', 'studio-a-slug')
  fd.set('name', 'Test Project')
  fd.set('type', 'wedding')
  fd.set('status', 'planning')
  if (overrides.clientId) fd.set('client_id', overrides.clientId)
  if (overrides.bookingId) fd.set('booking_id', overrides.bookingId)
  return fd
}

function invoiceFormData(clientId: string): FormData {
  const fd = new FormData()
  fd.set('id', 'invoice-1')
  fd.set('studio_slug', 'studio-a-slug')
  fd.set('items_json', JSON.stringify([{ description: 'Item', quantity: 1, unit_price: 100 }]))
  fd.set('status', 'draft')
  fd.set('client_id', clientId)
  return fd
}

function quoteFormData(clientId: string): FormData {
  const fd = new FormData()
  fd.set('id', 'quote-1')
  fd.set('studio_slug', 'studio-a-slug')
  fd.set('title', 'Test Quote')
  fd.set('items_json', JSON.stringify([{ description: 'Item', quantity: 1, unit_price: 100 }]))
  fd.set('status', 'draft')
  fd.set('client_id', clientId)
  return fd
}

function contractFormData(clientId: string): FormData {
  const fd = new FormData()
  fd.set('id', 'contract-1')
  fd.set('studio_slug', 'studio-a-slug')
  fd.set('title', 'Test Contract')
  fd.set('type', 'other')
  fd.set('client_id', clientId)
  return fd
}

function expenseFormData(projectId: string): FormData {
  const fd = new FormData()
  fd.set('amount', '100')
  fd.set('project_id', projectId)
  return fd
}

function taskFormData(projectId: string): FormData {
  const fd = new FormData()
  fd.set('title', 'Test Task')
  fd.set('project_id', projectId)
  return fd
}

describe('bookings: client_id must belong to the caller\'s own studio', () => {
  it('createBooking rejects a client_id from a different studio', async () => {
    await expect(bookingsActions.createBooking(bookingFormData(CLIENT_IN_B))).rejects.toThrow('Invalid client')
  })

  it('createBooking accepts a client_id that genuinely belongs to the caller\'s studio', async () => {
    await expect(bookingsActions.createBooking(bookingFormData(CLIENT_IN_A))).rejects.toThrow('REDIRECT:')
  })

  it('updateBooking rejects a client_id from a different studio', async () => {
    await expect(bookingsActions.updateBooking(bookingFormData(CLIENT_IN_B))).rejects.toThrow('Invalid client')
  })

  it('updateBooking accepts a client_id that genuinely belongs to the caller\'s studio', async () => {
    await expect(bookingsActions.updateBooking(bookingFormData(CLIENT_IN_A))).rejects.toThrow('REDIRECT:')
  })
})

describe('projects: client_id and booking_id must belong to the caller\'s own studio', () => {
  it('createProject rejects a client_id from a different studio', async () => {
    await expect(projectsActions.createProject(projectFormData({ clientId: CLIENT_IN_B }))).rejects.toThrow('Invalid client')
  })

  it('createProject rejects a booking_id from a different studio', async () => {
    await expect(projectsActions.createProject(projectFormData({ bookingId: BOOKING_IN_B }))).rejects.toThrow('Invalid booking')
  })

  it('createProject accepts references that genuinely belong to the caller\'s studio', async () => {
    await expect(projectsActions.createProject(projectFormData({ clientId: CLIENT_IN_A, bookingId: BOOKING_IN_A }))).rejects.toThrow('REDIRECT:')
  })

  it('updateProject rejects a client_id from a different studio', async () => {
    await expect(projectsActions.updateProject(projectFormData({ clientId: CLIENT_IN_B }))).rejects.toThrow('Invalid client')
  })

  it('updateProject rejects a booking_id from a different studio', async () => {
    await expect(projectsActions.updateProject(projectFormData({ bookingId: BOOKING_IN_B }))).rejects.toThrow('Invalid booking')
  })
})

describe('invoices: client_id must belong to the caller\'s own studio (confirmed live-exploitable path)', () => {
  it('createInvoice rejects a client_id from a different studio', async () => {
    await expect(invoicesActions.createInvoice(invoiceFormData(CLIENT_IN_B))).rejects.toThrow('Invalid client')
  })

  it('createInvoice accepts a client_id that genuinely belongs to the caller\'s studio', async () => {
    await expect(invoicesActions.createInvoice(invoiceFormData(CLIENT_IN_A))).rejects.toThrow('REDIRECT:')
  })

  it('updateInvoice rejects a client_id from a different studio', async () => {
    await expect(invoicesActions.updateInvoice(invoiceFormData(CLIENT_IN_B))).rejects.toThrow('Invalid client')
  })

  it('updateInvoice accepts a client_id that genuinely belongs to the caller\'s studio', async () => {
    await expect(invoicesActions.updateInvoice(invoiceFormData(CLIENT_IN_A))).rejects.toThrow('REDIRECT:')
  })
})

// Phase 12 Step 15: quotes.ts, contracts.ts, and questionnaires.ts never
// received the clientBelongsToStudio guard applied to bookings/projects/
// invoices above -- each accepted a client-supplied client_id and wrote it
// straight into the row, verified only by studio_id-scoped RLS on the
// mutation itself (which says nothing about which studio the referenced
// client belongs to). For quotes this was independently confirmed
// live-exploitable exactly like the original invoices.ts finding:
// sendQuoteSentEmail() resolves the linked client via supabaseAdmin
// (bypassing RLS) to get a name/email to send a real "your quote" email
// to -- so a quote created with a foreign client_id and status 'sent'
// would email a third party the acting studio has no relationship with.
describe('quotes: client_id must belong to the caller\'s own studio (confirmed live-exploitable path)', () => {
  it('createQuote rejects a client_id from a different studio', async () => {
    await expect(quotesActions.createQuote(quoteFormData(CLIENT_IN_B))).rejects.toThrow('Invalid client')
  })

  it('createQuote accepts a client_id that genuinely belongs to the caller\'s studio', async () => {
    await expect(quotesActions.createQuote(quoteFormData(CLIENT_IN_A))).rejects.toThrow('REDIRECT:')
  })

  it('updateQuote rejects a client_id from a different studio', async () => {
    await expect(quotesActions.updateQuote(quoteFormData(CLIENT_IN_B))).rejects.toThrow('Invalid client')
  })

  it('updateQuote accepts a client_id that genuinely belongs to the caller\'s studio', async () => {
    await expect(quotesActions.updateQuote(quoteFormData(CLIENT_IN_A))).rejects.toThrow('REDIRECT:')
  })
})

describe('contracts: client_id must belong to the caller\'s own studio', () => {
  it('createContract rejects a client_id from a different studio', async () => {
    await expect(contractsActions.createContract(contractFormData(CLIENT_IN_B))).rejects.toThrow('Invalid client')
  })

  it('createContract accepts a client_id that genuinely belongs to the caller\'s studio', async () => {
    await expect(contractsActions.createContract(contractFormData(CLIENT_IN_A))).rejects.toThrow('REDIRECT:')
  })

  it('updateContract rejects a client_id from a different studio', async () => {
    await expect(contractsActions.updateContract(contractFormData(CLIENT_IN_B))).rejects.toThrow('Invalid client')
  })

  it('updateContract accepts a client_id that genuinely belongs to the caller\'s studio', async () => {
    await expect(contractsActions.updateContract(contractFormData(CLIENT_IN_A))).rejects.toThrow('REDIRECT:')
  })
})

describe('questionnaires: sendQuestionnaire\'s client_id must belong to the caller\'s own studio', () => {
  it('rejects a client_id from a different studio', async () => {
    const result = await questionnairesActions.sendQuestionnaire('template-1', 'studio-a-slug', CLIENT_IN_B)
    expect(result).toEqual({ error: 'Invalid client' })
  })

  it('accepts a client_id that genuinely belongs to the caller\'s studio', async () => {
    const result = await questionnairesActions.sendQuestionnaire('template-1', 'studio-a-slug', CLIENT_IN_A)
    expect('success' in result && result.success).toBe(true)
  })

  it('accepts no client_id at all (questionnaires can be sent unassigned)', async () => {
    const result = await questionnairesActions.sendQuestionnaire('template-1', 'studio-a-slug', null)
    expect('success' in result && result.success).toBe(true)
  })
})

// Same class of gap, found while auditing the rest of src/lib/actions/ for
// the same pattern: expenses.project_id and tasks.project_id were also
// accepted straight from form input with no verification the referenced
// project belongs to the caller's own studio. No email-amplification path
// like sendQuoteSentEmail exists for either, so this is a data-integrity /
// tenant-boundary gap rather than a confirmed PII leak -- still fixed to
// match the established clientBelongsToStudio/bookingBelongsToStudio
// pattern via the new projectBelongsToStudio (projects.ts).
describe('expenses/tasks: project_id must belong to the caller\'s own studio', () => {
  it('createExpense rejects a project_id from a different studio', async () => {
    const result = await expensesActions.createExpense('studio-a-slug', expenseFormData(PROJECT_IN_B))
    expect(result).toEqual({ error: 'Invalid project' })
  })

  it('createExpense accepts a project_id that genuinely belongs to the caller\'s studio', async () => {
    const result = await expensesActions.createExpense('studio-a-slug', expenseFormData(PROJECT_IN_A))
    expect('success' in result && result.success).toBe(true)
  })

  it('createTask rejects a project_id from a different studio', async () => {
    const result = await tasksActions.createTask('studio-a-slug', taskFormData(PROJECT_IN_B))
    expect(result).toEqual({ error: 'Invalid project' })
  })

  it('createTask accepts a project_id that genuinely belongs to the caller\'s studio', async () => {
    const result = await tasksActions.createTask('studio-a-slug', taskFormData(PROJECT_IN_A))
    expect('success' in result && result.success).toBe(true)
  })
})

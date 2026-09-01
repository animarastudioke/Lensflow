import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

// Phase 11 Step 8 regression coverage: ProjectList's delete/bulk-delete
// already called the real deleteProject/archiveProjects Server Actions
// before this step -- but the fabricated `progress` and `deliverables`
// fields (always 0 / {photos:0,videos:0,albums:0}, no schema column backs
// them) were rendered as if real, and every row action pointed at
// /projects/new, /projects/[id], /projects/[id]/edit, none of which
// existed. This proves the delete flow still calls the real action (now via
// the shared ConfirmDialog) and that the fabricated progress bar / deliverable
// counts are gone from the rendered output.

const deleteProjectMock = vi.fn()
const archiveProjectsMock = vi.fn()

vi.mock('@/lib/actions/projects', () => ({
  deleteProject: (...args: unknown[]) => deleteProjectMock(...args),
  archiveProjects: (...args: unknown[]) => archiveProjectsMock(...args),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const { ProjectList } = await import('@/components/projects/ProjectList')

const project = {
  id: 'project-1',
  clientId: 'client-1',
  clientName: 'Jane Doe',
  clientEmail: 'jane@example.com',
  title: 'Doe Wedding',
  type: 'wedding' as const,
  status: 'planning' as const,
  startDate: '2026-06-01',
  location: 'Studio',
  totalValue: 1000,
  paidAmount: 0,
  balanceDue: 1000,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function selectProject() {
  fireEvent.click(screen.getByRole('checkbox', { name: `Select ${project.title}` }))
}

describe('ProjectList: no fabricated progress/deliverables data', () => {
  it('does not render a fake 0% progress bar or 0-count deliverables', () => {
    render(<ProjectList studioSlug="test-studio" initialProjects={[project]} />)
    expect(screen.queryByText(/% complete/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/0 photos/i)).not.toBeInTheDocument()
  })
})

describe('ProjectList: bulk delete calls the real Server Action', () => {
  it('deletes only after deleteProject resolves without error, then removes the row', async () => {
    deleteProjectMock.mockResolvedValue(undefined)
    render(<ProjectList studioSlug="test-studio" initialProjects={[project]} />)

    selectProject()
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteProjectMock).toHaveBeenCalledWith('project-1', 'test-studio'))
    await waitFor(() => expect(screen.queryByText('Doe Wedding')).not.toBeInTheDocument())
  })
})

describe('ProjectList: grid view "View" link points at the real detail route', () => {
  // The row dropdown's "View Details"/"Edit" items live inside a
  // Radix-portalled menu that does not reliably open under jsdom (tracked
  // as an environment limitation, not an app bug -- see the Step 8 report).
  // The grid view's plain, always-rendered "View" link exercises the same
  // href wiring without depending on that portal opening.
  it('links to /projects/[id], not a placeholder', () => {
    render(<ProjectList studioSlug="test-studio" initialProjects={[project]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Grid' }))
    const viewLink = screen.getByRole('link', { name: 'View' })
    expect(viewLink).toHaveAttribute('href', '/dashboard/test-studio/projects/project-1')
  })
})

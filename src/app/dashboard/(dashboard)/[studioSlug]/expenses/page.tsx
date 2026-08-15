import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { getExpenses } from '@/lib/actions/expenses'
import { getProjects } from '@/lib/actions/projects'
import { getStudioCurrency } from '@/lib/actions/studios'
import { ExpenseList } from '@/components/expenses/ExpenseList'

interface ExpensesPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: ExpensesPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Expenses - ${studioSlug}`,
    description: 'Track studio costs and project spend',
  }
}

export default async function ExpensesPage({ params }: ExpensesPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const [expenses, { projects }, currency] = await Promise.all([
    getExpenses(studioSlug),
    getProjects(studioSlug),
    getStudioCurrency(studioSlug),
  ])

  return (
    <ExpenseList
      studioSlug={studioSlug}
      initialExpenses={expenses}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      currency={currency}
    />
  )
}

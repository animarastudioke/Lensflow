import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { getTasks } from '@/lib/actions/tasks'
import { getProjects } from '@/lib/actions/projects'
import { TaskList } from '@/components/tasks/TaskList'

interface TasksPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: TasksPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Tasks - ${studioSlug}`,
    description: 'Track work across your studio',
  }
}

export default async function TasksPage({ params }: TasksPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const [tasks, { projects }] = await Promise.all([
    getTasks(studioSlug),
    getProjects(studioSlug),
  ])

  return (
    <TaskList
      studioSlug={studioSlug}
      initialTasks={tasks}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    />
  )
}

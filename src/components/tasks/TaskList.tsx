'use client'

import * as React from 'react'
import { format, isPast, isToday } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ListChecks,
  Plus,
  Search,
  Loader2,
  Trash2,
  Circle,
  CircleDot,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createTask,
  updateTaskStatus,
  deleteTask,
  type TaskRow,
  type TaskStatus,
  type TaskPriority,
} from '@/lib/actions/tasks'

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Circle; variant: 'outline' | 'warning' | 'success' }> = {
  todo: { label: 'To Do', icon: Circle, variant: 'outline' },
  in_progress: { label: 'In Progress', icon: CircleDot, variant: 'warning' },
  done: { label: 'Done', icon: CheckCircle2, variant: 'success' },
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; variant: 'outline' | 'secondary' | 'destructive' }> = {
  low: { label: 'Low', variant: 'outline' },
  medium: { label: 'Medium', variant: 'secondary' },
  high: { label: 'High', variant: 'destructive' },
}

interface ProjectOption {
  id: string
  name: string
}

interface TaskListProps {
  studioSlug: string
  initialTasks: TaskRow[]
  projects: ProjectOption[]
}

export function TaskList({ studioSlug, initialTasks, projects }: TaskListProps) {
  const [tasks, setTasks] = React.useState(initialTasks)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  const filteredTasks = React.useMemo(() => {
    let result = tasks
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter)
    }
    return result
  }, [tasks, searchQuery, statusFilter])

  const todoCount = tasks.filter((t) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length
  const doneCount = tasks.filter((t) => t.status === 'done').length
  const overdueCount = tasks.filter((t) => t.status !== 'done' && t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length

  async function handleCreate(formData: FormData) {
    setIsSubmitting(true)
    setFormError(null)
    const result = await createTask(studioSlug, formData)
    if ('error' in result) {
      setFormError(result.error)
      setIsSubmitting(false)
      return
    }
    toast.success('Task created')
    setIsCreateOpen(false)
    setIsSubmitting(false)
    window.location.reload()
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    setPendingId(taskId)
    const result = await updateTaskStatus(taskId, status, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status, completedAt: status === 'done' ? new Date().toISOString() : null } : t)))
    }
    setPendingId(null)
  }

  async function confirmDelete(taskId: string) {
    const result = await deleteTask(taskId, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      toast.success('Task deleted')
    }
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">To do</span>
            <Circle className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">{todoCount}</div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">In progress</span>
            <CircleDot className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-warning tabular-nums">{inProgressCount}</div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Done</span>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-success tabular-nums">{doneCount}</div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Overdue</span>
            <AlertTriangle className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-destructive tabular-nums">{overdueCount}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-display font-semibold text-foreground">Tasks</h1>
          <p className="text-body text-muted-foreground mt-1">Track work across your studio</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead className="hidden md:table-cell">Project</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="hidden lg:table-cell">Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <ListChecks className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No tasks found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => {
                  const isPending = pendingId === task.id
                  const isOverdue = task.status !== 'done' && task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
                  return (
                    <TableRow key={task.id} className="hover:bg-muted/50">
                      <TableCell>
                        <p className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                        {task.description && <p className="text-sm text-muted-foreground truncate max-w-[280px]">{task.description}</p>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{task.projectName ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={PRIORITY_CONFIG[task.priority].variant}>{PRIORITY_CONFIG[task.priority].label}</Badge>
                      </TableCell>
                      <TableCell className={`hidden lg:table-cell text-sm ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={task.status}
                          onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                          disabled={isPending}
                        >
                          <SelectTrigger className="w-[140px]">
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
                              <SelectItem key={status} value={status}>{STATUS_CONFIG[status].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirm(task.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form action={handleCreate}>
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
              <DialogDescription>Add a task to your studio&apos;s to-do list.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input name="title" placeholder="Edit ceremony highlights" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" placeholder="Optional details..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input name="due_date" type="date" />
                </div>
              </div>
              {projects.length > 0 && (
                <div className="space-y-2">
                  <Label>Project (optional)</Label>
                  <Select name="project_id">
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && confirmDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import * as React from 'react'
import { format } from 'date-fns'
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
import { Receipt, Plus, Search, Loader2, Trash2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/currencies'
import { createExpense, deleteExpense, type ExpenseRow, type ExpenseCategory } from '@/lib/actions/expenses'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  equipment: 'Equipment',
  software: 'Software',
  travel: 'Travel',
  marketing: 'Marketing',
  venue: 'Venue',
  staff: 'Staff',
  supplies: 'Supplies',
  other: 'Other',
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[]

interface ProjectOption {
  id: string
  name: string
}

interface ExpenseListProps {
  studioSlug: string
  initialExpenses: ExpenseRow[]
  projects: ProjectOption[]
  currency: string
}

export function ExpenseList({ studioSlug, initialExpenses, projects, currency }: ExpenseListProps) {
  const [expenses, setExpenses] = React.useState(initialExpenses)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)

  const filteredExpenses = React.useMemo(() => {
    let result = expenses
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((e) => e.vendor?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q))
    }
    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category === categoryFilter)
    }
    return result
  }, [expenses, searchQuery, categoryFilter])

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
  const now = new Date()
  const thisMonthTotal = expenses
    .filter((e) => {
      const d = new Date(e.expenseDate)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, e) => sum + e.amount, 0)

  const byCategory = React.useMemo(() => {
    const map = new Map<ExpenseCategory, number>()
    for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    return entries[0] ? { category: entries[0][0], amount: entries[0][1] } : null
  }, [expenses])

  async function handleCreate(formData: FormData) {
    setIsSubmitting(true)
    setFormError(null)
    const result = await createExpense(studioSlug, formData)
    if ('error' in result) {
      setFormError(result.error)
      setIsSubmitting(false)
      return
    }
    toast.success('Expense logged')
    setIsCreateOpen(false)
    setIsSubmitting(false)
    window.location.reload()
  }

  async function confirmDelete(expenseId: string) {
    const result = await deleteExpense(expenseId, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
      toast.success('Expense deleted')
    }
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Total expenses</span>
            <DollarSign className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">{formatCurrency(totalAmount, currency)}</div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">This month</span>
            <Receipt className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">{formatCurrency(thisMonthTotal, currency)}</div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Top category</span>
            <Receipt className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 text-lg font-medium text-foreground">
            {byCategory ? CATEGORY_LABELS[byCategory.category] : '—'}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-display font-semibold text-foreground">Expenses</h1>
          <p className="text-body text-muted-foreground mt-1">Track studio costs and project spend</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Log Expense
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
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
                <TableHead>Vendor / Description</TableHead>
                <TableHead className="hidden md:table-cell">Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No expenses found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-muted/50">
                    <TableCell>
                      <p className="font-medium">{expense.vendor || 'Unnamed expense'}</p>
                      {expense.description && <p className="text-sm text-muted-foreground truncate max-w-[280px]">{expense.description}</p>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{expense.projectName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{CATEGORY_LABELS[expense.category]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(expense.expenseDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-medium">{formatCurrency(expense.amount, expense.currency)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirm(expense.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form action={handleCreate}>
            <DialogHeader>
              <DialogTitle>Log Expense</DialogTitle>
              <DialogDescription>Record a studio cost.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Input name="vendor" placeholder="B&H Photo" />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input name="amount" type="number" step="0.01" min="0" placeholder="0.00" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" placeholder="Optional details..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select name="category" defaultValue="other">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
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
                Log Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete expense</DialogTitle>
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

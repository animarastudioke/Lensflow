import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DataTableColumn<T> {
  key: string
  header: string
  accessor: keyof T | ((row: T) => React.ReactNode)
  width?: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  selection?: string[]
  onSelectionChange?: (keys: string[]) => void
  sortable?: boolean
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  loading?: boolean
  emptyMessage?: string
  className?: string
  rowClassName?: (row: T) => string
}

function DataTableHeader<T>({
  columns,
  sortable,
  sortColumn,
  sortDirection,
  onSort,
  selection,
  onSelectAll,
}: {
  columns: DataTableColumn<T>[]
  sortable?: boolean
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  selection?: string[]
  onSelectAll?: () => void
}) {
  return (
    <thead className="border-b border-border">
      <tr className="hover:bg-transparency">
        {selection && onSelectAll && (
          <th className="w-12 px-4 py-3 text-left">
            <input
              type="checkbox"
              checked={selection.length > 0}
              onChange={onSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
            />
          </th>
        )}
        {columns.map((column) => (
          <th
            key={column.key}
            className={cn(
              'px-4 py-3 text-left font-medium text-muted-foreground',
              column.className
            )}
            style={{ width: column.width }}
          >
            {sortable && column.sortable && onSort ? (
              <button
                onClick={() =>
                  onSort(column.key, sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc')
                }
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {column.header}
                {sortColumn === column.key && (
                  sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                )}
              </button>
            ) : (
              column.header
            )}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function DataTableBody<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selection,
  onSelectionChange,
  rowClassName,
  emptyMessage = 'No data available',
}: {
  columns: DataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  selection?: string[]
  onSelectionChange?: (keys: string[]) => void
  rowClassName?: (row: T) => string
  emptyMessage?: string
}) {
  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-12 text-center text-muted-foreground">
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody className="divide-y divide-border/50">
      {data.map((row) => {
        const key = keyExtractor(row)
        const isSelected = selection?.includes(key)

        return (
          <tr
            key={key}
            className={cn(
              'transition-colors hover:bg-muted/50',
              isSelected && 'bg-primary/5',
              rowClassName?.(row)
            )}
            onClick={() => onRowClick?.(row)}
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
          >
            {selection && onSelectionChange && (
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation()
                    const newSelection = isSelected
                      ? selection.filter((k) => k !== key)
                      : [...selection, key]
                    onSelectionChange(newSelection)
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                />
              </td>
            )}
            {columns.map((column) => (
              <td key={column.key} className={cn('px-4 py-3', column.className)}>
                {column.render
                  ? column.render(column.accessor as keyof T, row)
                  : typeof column.accessor === 'function'
                    ? column.accessor(row)
                    : String(row[column.accessor as keyof T] ?? '')}
              </td>
            ))}
          </tr>
        )
      })}
    </tbody>
  )
}

function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <div className="text-sm text-muted-foreground">
        Showing {start} to {end} of {total} results
      </div>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 px-2 text-sm border border-input rounded-md bg-background"
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            aria-label="First page"
          >
            <ChevronLeft className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            aria-label="Last page"
          >
            <ChevronRight className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selection,
  onSelectionChange,
  sortable = false,
  sortColumn,
  sortDirection,
  onSort,
  pagination,
  loading = false,
  emptyMessage,
  className,
  rowClassName,
}: DataTableProps<T>) {
  const [sortColumnState, setSortColumnState] = React.useState(sortColumn)
  const [sortDirectionState, setSortDirectionState] = React.useState(sortDirection ?? 'asc')
  const [selectionState, setSelectionState] = React.useState<string[]>(selection ?? [])

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumnState(column)
    setSortDirectionState(direction)
    onSort?.(column, direction)
  }

  const handleSelectAll = () => {
    if (selectionState.length === data.length) {
      setSelectionState([])
      onSelectionChange?.([])
    } else {
      const allKeys = data.map(keyExtractor)
      setSelectionState(allKeys)
      onSelectionChange?.(allKeys)
    }
  }

  return (
    <div className={cn('rounded-md border border-border overflow-hidden', className)}>
      {loading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <DataTableHeader
            columns={columns}
            sortable={sortable}
            sortColumn={sortColumnState}
            sortDirection={sortDirectionState}
            onSort={handleSort}
            selection={selectionState}
            onSelectAll={handleSelectAll}
          />
          <DataTableBody
            columns={columns}
            data={data}
            keyExtractor={keyExtractor}
            onRowClick={onRowClick}
            selection={selectionState}
            onSelectionChange={setSelectionState}
            rowClassName={rowClassName}
            emptyMessage={emptyMessage}
          />
        </table>
      </div>
      {pagination && (
        <DataTablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  )
}
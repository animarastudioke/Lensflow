import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Search, Filter } from 'lucide-react'

interface TableToolbarProps {
  title?: string
  description?: string
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: Array<{
    key: string
    label: string
    options: Array<{ value: string; label: string }>
    value?: string
    onChange?: (value: string) => void
  }>
  actions?: React.ReactNode
  className?: string
}

export function TableToolbar({
  title,
  description,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  actions,
  className,
}: TableToolbarProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      {title && (
        <div className="flex-1 min-w-0">
          <h3 className="text-heading-md font-semibold truncate">{title}</h3>
          {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {searchPlaceholder && (
          <div className="relative max-w-sm sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9 pr-4"
              aria-label={searchPlaceholder}
            />
          </div>
        )}

        {filters.map((filter) => (
          <div key={filter.key} className="relative">
            <select
              value={filter.value ?? ''}
              onChange={(e) => filter.onChange?.(e.target.value)}
              className="h-9 px-3 pr-8 text-sm border border-input rounded-lg bg-background appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={filter.label}
            >
              <option value="">All {filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        ))}

        {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
      </div>
    </div>
  )
}
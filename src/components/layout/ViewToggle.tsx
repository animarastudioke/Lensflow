import * as React from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ViewToggleOption<T extends string> {
  value: T
  label: string
  icon: LucideIcon
}

export interface ViewToggleProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: ViewToggleOption<T>[]
  className?: string
}

/**
 * The one shared list/grid/calendar view toggle. Previously Projects,
 * Clients, and Bookings each hand-rolled their own pair of buttons with
 * slightly different active-state styling.
 */
export function ViewToggle<T extends string>({
  value,
  onValueChange,
  options,
  className,
}: ViewToggleProps<T>) {
  return (
    <div
      role="group"
      className={cn('inline-flex items-center rounded-md border border-input bg-background p-0.5', className)}
    >
      {options.map((option) => {
        const isActive = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.label}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

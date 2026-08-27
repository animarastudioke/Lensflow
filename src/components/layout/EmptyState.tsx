import * as React from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  /** Use inside a table cell or other tight space -- smaller icon/padding, no action wrap. */
  compact?: boolean
  className?: string
}

/**
 * The one authoritative empty state. Every list in the app previously
 * hand-coded its own "No X found" text -- this replaces that with a
 * quiet, editorial pattern that explains what's missing and what to do
 * next, per the design direction's "no giant illustrations" rule.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-16',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-muted text-muted-foreground',
            compact ? 'h-9 w-9' : 'h-12 w-12'
          )}
        >
          <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
        </div>
      )}
      <div className="space-y-1">
        <p className={cn('font-medium text-foreground', compact ? 'text-body-sm' : 'text-heading-sm')}>
          {title}
        </p>
        {description && (
          <p className={cn('text-muted-foreground', compact ? 'text-caption' : 'text-body-sm', 'max-w-sm')}>
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Button size={compact ? 'sm' : 'default'} onClick={action.onClick} asChild={!!action.href}>
              {action.href ? <a href={action.href}>{action.label}</a> : action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              size={compact ? 'sm' : 'default'}
              onClick={secondaryAction.onClick}
              asChild={!!secondaryAction.href}
            >
              {secondaryAction.href ? <a href={secondaryAction.href}>{secondaryAction.label}</a> : secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

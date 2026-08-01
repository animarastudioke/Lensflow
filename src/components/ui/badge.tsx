import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
}

const badgeVariants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
  outline: 'text-foreground border-border hover:bg-accent',
  success: 'bg-success text-success-foreground hover:bg-success/80',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/80',
  info: 'bg-info text-info-foreground hover:bg-info/80',
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

interface AvatarBadgeProps {
  count?: number
  max?: number
  className?: string
}

export function AvatarBadge({ count = 0, max = 99, className }: AvatarBadgeProps) {
  const displayCount = count > max ? `${max}+` : count

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground',
        className
      )}
    >
      {displayCount}
    </span>
  )
}

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  removable?: boolean
  onRemove?: () => void
  variant?: 'default' | 'outline'
}

export function Tag({
  className,
  removable = false,
  onRemove,
  variant = 'default',
  children,
  ...props
}: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        variant === 'outline'
          ? 'border-border bg-transparent hover:bg-accent'
          : 'bg-secondary text-secondary-foreground border-transparent',
        className
      )}
      {...props}
    >
      {children}
      {removable && (
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove tag"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </span>
  )
}

export function TagInput({
  value,
  onChange,
  onAdd,
  onRemove,
  maxTags = 20,
  placeholder = 'Add tag...',
  className,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  onAdd?: (tag: string) => void
  onRemove?: (tag: string) => void
  maxTags?: number
  placeholder?: string
  className?: string
}) {
  const [inputValue, setInputValue] = React.useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      const tag = inputValue.trim()
      if (!value.includes(tag) && value.length < maxTags) {
        const newTags = [...value, tag]
        onChange(newTags)
        onAdd?.(tag)
        setInputValue('')
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onRemove?.(value[value.length - 1])
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {value.map((tag, index) => (
        <Tag key={`${tag}-${index}`} removable onRemove={() => onRemove?.(tag)}>
          {tag}
        </Tag>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length >= maxTags ? undefined : placeholder}
        disabled={value.length >= maxTags}
        className="flex-1 min-w-[120px] h-8 px-2 py-1 text-sm bg-transparent border-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none placeholder:text-muted-foreground"
        aria-label={placeholder}
      />
    </div>
  )
}
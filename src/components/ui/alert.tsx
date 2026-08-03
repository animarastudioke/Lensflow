import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'success' | 'destructive' | 'warning' }
>(({ className, variant = 'default', ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
        {
          'bg-background text-foreground': variant === 'default',
          'border-green-500/50 text-green-500 dark:border-green-500/50 dark:text-green-400 bg-green-500/10':
            variant === 'success',
          'border-red-500/50 text-red-500 dark:border-red-500/50 dark:text-red-400 bg-red-500/10':
            variant === 'destructive',
          'border-yellow-500/50 text-yellow-500 dark:border-yellow-500/50 dark:text-yellow-400 bg-yellow-500/10':
            variant === 'warning',
        },
        className
      )}
      {...props}
    />
  )
})
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed [&_p]:my-1.5', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
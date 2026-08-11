import Link from 'next/link'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="12.5" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
      <circle cx="14" cy="14" r="7" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14" cy="14" r="2.4" fill="currentColor" />
    </svg>
  )
}

export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-center gap-2 font-display text-lg font-medium tracking-tight',
        dark ? 'text-white' : 'text-foreground',
        className
      )}
      aria-label="LensFlow — home"
    >
      <LogoMark className={dark ? 'text-white' : 'text-primary'} />
      <span>LensFlow</span>
    </Link>
  )
}

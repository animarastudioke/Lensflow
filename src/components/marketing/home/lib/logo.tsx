import Link from 'next/link'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="5" />
      <g fill="currentColor">
        <path d="M50,50 C44,40 44,24 50,16 C55,25 54,40 50,50 Z" />
        <path d="M50,50 C44,40 44,24 50,16 C55,25 54,40 50,50 Z" transform="rotate(60 50 50)" />
        <path d="M50,50 C44,40 44,24 50,16 C55,25 54,40 50,50 Z" transform="rotate(120 50 50)" />
        <path d="M50,50 C44,40 44,24 50,16 C55,25 54,40 50,50 Z" transform="rotate(180 50 50)" />
        <path d="M50,50 C44,40 44,24 50,16 C55,25 54,40 50,50 Z" transform="rotate(240 50 50)" />
        <path d="M50,50 C44,40 44,24 50,16 C55,25 54,40 50,50 Z" transform="rotate(300 50 50)" />
      </g>
      <circle cx="50" cy="50" r="7" fill="currentColor" />
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

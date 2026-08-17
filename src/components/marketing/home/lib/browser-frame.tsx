import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function BrowserFrame({
  children,
  className,
  url = 'app.lensflow.co.ke',
}: {
  children: ReactNode
  className?: string
  url?: string
}) {
  return (
    <div
      className={cn(
        // Fixed dark app chrome, independent of page theme — a product screenshot
        // reads the same whether the marketing page around it is light or dark.
        'overflow-hidden rounded-xl border border-white/10 bg-[#15151a] shadow-2xl shadow-black/40',
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-white/10 bg-black/20 px-4 py-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </div>
        <div className="mx-auto flex max-w-xs flex-1 items-center justify-center rounded-md bg-white/5 px-3 py-1 text-center font-mono text-[11px] text-white/50">
          {url}
        </div>
        <div className="w-[52px]" aria-hidden="true" />
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}

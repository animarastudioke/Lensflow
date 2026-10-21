import type { ReactNode } from 'react'
import { ScrollReveal } from './scroll-reveal'

/**
 * Direction A section head: Spectral title on the left, a mono wall-label
 * caption on the right, and a 1px foreground-ink rule underneath. One shared
 * component so every homepage section reads as the same "wall" rather than
 * repeating a hand-written className string nine times.
 */
export function SectionHead({
  title,
  caption,
  intro,
}: {
  title: ReactNode
  caption: string
  intro?: ReactNode
}) {
  return (
    <ScrollReveal>
      <div className="flex flex-col gap-3 border-b border-foreground pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <h2 className="max-w-2xl text-balance font-display text-display-md font-medium text-foreground">
          {title}
        </h2>
        <span className="label-caption shrink-0 sm:text-right">{caption}</span>
      </div>
      {intro ? <p className="mt-6 max-w-2xl text-body-lg text-muted-foreground">{intro}</p> : null}
    </ScrollReveal>
  )
}

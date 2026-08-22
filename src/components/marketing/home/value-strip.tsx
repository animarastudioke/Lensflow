import { VALUE_STRIP_ITEMS } from '@/lib/constants/homepage'
import { ScrollReveal } from './lib/scroll-reveal'

/**
 * A capability strip, not a trust/social-proof strip — its predecessor
 * (TrustStrip) occupied this slot with category words ("Photography,
 * Videography...") that read as social proof but weren't. This is
 * explicitly about product comprehension: what LensFlow actually covers.
 */
export function ValueStrip() {
  return (
    <section className="border-b border-border bg-background py-10 sm:py-12">
      <div className="container-wide">
        <ScrollReveal variant="fadeIn" duration={0.5}>
          <p className="text-center font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Everything between inquiry and delivery.
          </p>
          <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:gap-x-4">
            {VALUE_STRIP_ITEMS.map((item, index) => (
              <li key={item} className="flex items-center gap-3 sm:gap-4">
                {index > 0 && <span className="h-1 w-1 rounded-full bg-border" aria-hidden="true" />}
                <span className="font-display text-lg text-foreground/80 sm:text-xl">{item}</span>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </div>
    </section>
  )
}

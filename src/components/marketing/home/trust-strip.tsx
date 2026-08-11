import { TRUST_INDICATORS } from '@/lib/constants/homepage'
import { ScrollReveal } from './lib/scroll-reveal'

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-background py-10 sm:py-12">
      <div className="container-wide">
        <ScrollReveal variant="fadeIn" duration={0.5}>
          <p className="text-center font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Built for creatives who take their business seriously
          </p>
          <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-14">
            {TRUST_INDICATORS.map((item) => (
              <li
                key={item}
                className="font-display text-lg italic text-muted-foreground/80 sm:text-xl"
              >
                {item}
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </div>
    </section>
  )
}

import Link from 'next/link'
import { ArrowRight, Check, X } from 'lucide-react'
import { PRICING_COMPARISON } from '@/lib/constants/homepage'
import { ScrollReveal } from './lib/scroll-reveal'

export function PricingPreview() {
  return (
    <section className="page-section bg-background">
      <div className="container-wide">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-caption text-primary">Pricing</span>
            <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Professional tools. Without the professional-software bill.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              LensFlow brings the tools photographers actually need into one affordable platform —
              one subscription, no unnecessary add-ons, transparent pricing.
            </p>
          </div>
        </ScrollReveal>

        <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
          <ScrollReveal variant="slideInLeft">
            <div className="h-full rounded-xl border border-border bg-card p-6 sm:p-7">
              <p className="label-caption mb-5">Stitching it together yourself</p>
              <ul className="space-y-3">
                {PRICING_COMPARISON.before.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="slideInRight" delay={0.1}>
            <div className="h-full rounded-xl border border-primary/30 bg-card p-6 shadow-lg shadow-primary/5 sm:p-7">
              <p className="label-caption mb-5 text-primary">With LensFlow</p>
              <ul className="space-y-3">
                {PRICING_COMPARISON.after.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary link-underline"
              >
                View pricing
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

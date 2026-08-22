import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PRICING_TIERS } from '@/lib/constants/pricing'
import { ScrollReveal, StaggerGroup, StaggerItem } from './lib/scroll-reveal'

// A condensed teaser of the real /pricing page — same PRICING_TIERS data
// (the single source of truth), fewer features shown per card so the
// section stays scannable; "Compare all plans" links to the full breakdown.
const TEASER_FEATURE_COUNT = 4

export function Pricing() {
  return (
    <section className="page-section bg-background" id="pricing">
      <div className="container-wide">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-caption text-primary">Pricing</span>
            <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Simple pricing that grows with your business.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Upgrade when your studio needs more storage and more ways to run your
              business.
            </p>
          </div>
        </ScrollReveal>

        <StaggerGroup
          className="mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.06}
        >
          {PRICING_TIERS.map((tier) => (
            <StaggerItem key={tier.id}>
              <div
                className={cn(
                  'flex h-full flex-col rounded-md border p-5',
                  tier.highlighted ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
                )}
              >
                {tier.highlighted ? (
                  <Badge className="mb-3 w-fit">Most popular</Badge>
                ) : (
                  <div className="mb-3 h-[22px]" aria-hidden="true" />
                )}

                <h3 className="font-display text-heading-lg text-foreground">{tier.name}</h3>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-medium tabular-nums text-foreground">
                    ${tier.price}
                  </span>
                  <span className="text-body-sm text-muted-foreground">/month</span>
                </div>
                <p className="label-caption mt-1">{tier.storage}</p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {tier.features.slice(0, TEASER_FEATURE_COUNT).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-body-sm text-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button className="mt-6" variant={tier.highlighted ? 'default' : 'outline'} asChild>
                  <Link href={tier.cta.href}>{tier.cta.label}</Link>
                </Button>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary link-underline"
          >
            Compare all plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

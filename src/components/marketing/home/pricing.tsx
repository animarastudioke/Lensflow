import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PRICING_TIERS } from '@/lib/constants/pricing'
import { SectionHead } from './lib/section-head'
import { StaggerGroup, StaggerItem } from './lib/scroll-reveal'

// A condensed teaser of the real /pricing page — same PRICING_TIERS data
// (the single source of truth), fewer features shown per card so the
// section stays scannable; "Compare all plans" links to the full breakdown.
const TEASER_FEATURE_COUNT = 4

export function Pricing() {
  return (
    <section className="page-section" id="pricing">
      <div className="container-wide">
        <SectionHead
          title="Simple pricing that grows with your business."
          caption="Pricing"
          intro="Start free. Upgrade when your studio needs more storage and more ways to run your business."
        />

        <StaggerGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.06}>
          {PRICING_TIERS.map((tier, index) => (
            <StaggerItem key={tier.id} className="h-full">
              <div
                className={cn(
                  'flex h-full flex-col rounded-md border bg-card p-6',
                  tier.highlighted ? 'border-primary' : 'border-border'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="label-caption">Plan {String(index + 1).padStart(2, '0')}</span>
                  {tier.highlighted ? (
                    <span className="label-caption inline-flex items-center gap-1.5 text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                      Most popular
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-4 font-display text-heading-xl font-medium text-foreground">
                  {tier.name}
                </h3>

                <div className="mt-3">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-2xl font-medium tabular-nums text-foreground">
                      KES {tier.priceKes.toLocaleString()}
                    </span>
                    <span className="text-body-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="font-mono text-caption tabular-nums text-muted-foreground">
                    ≈ ${tier.priceUsd} USD
                  </p>
                </div>
                <p className="label-caption mt-3">{tier.storage}</p>

                <ul className="mt-5 flex-1 border-t border-border">
                  {tier.features.slice(0, TEASER_FEATURE_COUNT).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 border-b border-border py-2.5 text-body-sm text-foreground"
                    >
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
            className="focus-ring inline-flex items-center gap-1.5 text-sm font-medium text-primary link-underline"
          >
            Compare all plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

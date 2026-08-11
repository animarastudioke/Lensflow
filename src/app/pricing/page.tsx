import Link from 'next/link'
import { Check } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { PRICING_TIERS, PRICING_FAQ } from '@/lib/constants/pricing'
import { PAYMENT_METHODS } from '@/lib/constants/homepage'

export const metadata = {
  title: 'Pricing',
  description: 'One subscription for your entire photography business — plans from free to full studio, with no long-term contract.',
}

export default function PricingPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Pricing"
        title="One subscription. Everything included."
        description="Start free, no credit card required. Upgrade whenever your studio is ready — cancel anytime."
      />

      <section className="border-t border-border pb-20 pt-4 sm:pb-28">
        <div className="container-wide">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={cn(
                  'flex flex-col rounded-lg border p-6',
                  tier.highlighted ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
                )}
              >
                {tier.highlighted ? (
                  <Badge className="mb-4 w-fit">Most popular</Badge>
                ) : (
                  <div className="mb-4 h-[22px]" aria-hidden="true" />
                )}

                <h3 className="font-display text-heading-xl text-foreground">{tier.name}</h3>
                <p className="mt-1 text-body-sm text-muted-foreground">{tier.description}</p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-medium tabular-nums text-foreground">
                    ${tier.price}
                  </span>
                  <span className="text-body-sm text-muted-foreground">/month</span>
                </div>
                <p className="label-caption mt-1">{tier.storage}</p>

                <Button className="mt-6" variant={tier.highlighted ? 'default' : 'outline'} asChild>
                  <Link href={tier.cta.href}>{tier.cta.label}</Link>
                </Button>

                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-body-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl text-center">
            <p className="label-caption mb-4">Accepted payment methods</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {PAYMENT_METHODS.map((method) => (
                <span
                  key={method.label}
                  className="rounded-full border border-border px-3.5 py-1.5 text-body-sm text-muted-foreground"
                >
                  {method.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-section border-t border-border">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-display-sm font-display font-semibold tracking-tight text-foreground">
              Pricing questions
            </h2>
            <Accordion type="single" collapsible className="mt-8">
              {PRICING_FAQ.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger className="w-full text-left text-body-lg font-medium text-foreground hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-body text-muted-foreground">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <MarketingCTA
        title="Ready to get started?"
        description="Create your free account — no credit card required. Upgrade anytime as you grow."
      />
    </MarketingShell>
  )
}

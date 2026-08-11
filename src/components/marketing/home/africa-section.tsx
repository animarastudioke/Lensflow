import Image from 'next/image'
import { Banknote, Coins, Globe2, MessageCircle, Smartphone, Wallet } from 'lucide-react'
import { AFRICA_SECTION_IMAGE } from '@/lib/constants/homepage'
import { ScrollReveal, StaggerGroup, StaggerItem } from './lib/scroll-reveal'

const CAPABILITIES = [
  { icon: Smartphone, label: 'M-Pesa', description: 'Native support for Kenya’s leading mobile money network' },
  { icon: Wallet, label: 'Mobile money', description: 'Collect payments the way your clients already pay' },
  { icon: Coins, label: 'Local currencies', description: 'Invoice and get paid in your own currency' },
  { icon: Banknote, label: 'International payments', description: 'Cards and bank transfers for clients anywhere' },
  { icon: MessageCircle, label: 'WhatsApp updates', description: 'Booking and delivery notifications where clients read them' },
  { icon: Globe2, label: 'Affordable plans', description: 'One subscription, priced for growing studios' },
]

export function AfricaSection() {
  return (
    <section className="page-section bg-muted/40">
      <div className="container-wide grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <ScrollReveal variant="slideInLeft">
          <div className="relative aspect-[4/5] max-w-md overflow-hidden rounded-xl lg:max-w-none">
            <Image
              src={`https://images.unsplash.com/${AFRICA_SECTION_IMAGE.src}?w=900&q=75&auto=format&fit=crop`}
              alt={AFRICA_SECTION_IMAGE.alt}
              fill
              sizes="(max-width: 1024px) 90vw, 480px"
              className="object-cover"
            />
          </div>
        </ScrollReveal>

        <div>
          <ScrollReveal>
            <span className="label-caption text-primary">Built for where you work</span>
            <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Built for where you work. Ready for everywhere.
            </h2>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Modern business tools shouldn&apos;t require expensive international subscriptions or
              complicated payment systems.
            </p>
          </ScrollReveal>

          <StaggerGroup className="mt-8 grid gap-3 sm:grid-cols-2" staggerDelay={0.06}>
            {CAPABILITIES.map((capability) => (
              <StaggerItem key={capability.label}>
                <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <capability.icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{capability.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{capability.description}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <ScrollReveal delay={0.2}>
            <p className="mt-8 font-display text-lg italic text-foreground">
              From Mombasa to New York, LensFlow works wherever your clients are.
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

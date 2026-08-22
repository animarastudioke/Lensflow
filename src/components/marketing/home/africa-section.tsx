import Image from 'next/image'
import { AFRICA_SECTION_IMAGE, LOCAL_MARKET_CAPABILITIES } from '@/lib/constants/homepage'
import { ScrollReveal, StaggerGroup, StaggerItem } from './lib/scroll-reveal'

export function AfricaSection() {
  return (
    <section className="page-section bg-muted/40">
      <div className="container-wide grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <ScrollReveal variant="slideInLeft">
          <div className="relative aspect-[4/5] max-w-md overflow-hidden rounded-md lg:max-w-none">
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
              Built for where you work. Ready to grow with you.
            </h2>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Modern business tools should work with the way creative businesses actually
              operate — starting with M-Pesa payments in Kenya.
            </p>
          </ScrollReveal>

          <StaggerGroup className="mt-8 grid gap-3 sm:grid-cols-2" staggerDelay={0.06}>
            {LOCAL_MARKET_CAPABILITIES.map((capability) => (
              <StaggerItem key={capability.label}>
                <div className="flex items-start gap-3 rounded-md border border-border bg-card p-4">
                  <capability.icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{capability.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{capability.description}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </div>
    </section>
  )
}

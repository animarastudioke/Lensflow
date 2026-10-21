import Image from 'next/image'
import { AFRICA_SECTION_IMAGE, LOCAL_MARKET_CAPABILITIES } from '@/lib/constants/homepage'
import { ScrollReveal } from './lib/scroll-reveal'

export function AfricaSection() {
  return (
    <section className="page-section">
      <div className="container-wide">
        <ScrollReveal>
          <div className="grid gap-10 rounded-md border border-border bg-card p-6 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14 lg:p-12">
            <div>
              <span className="label-caption text-primary">Built for Kenya</span>
              <h2 className="mt-3 max-w-xl text-balance font-display text-display-md font-medium text-foreground">
                Built for where you work. Ready to grow with you.
              </h2>
              <p className="mt-4 max-w-xl text-body-lg text-muted-foreground">
                Modern business tools should work with the way creative businesses actually
                operate — starting with M-Pesa payments in Kenya.
              </p>

              <ul className="mt-8 border-t border-border">
                {LOCAL_MARKET_CAPABILITIES.map((capability) => (
                  <li
                    key={capability.label}
                    className="flex items-start gap-3 border-b border-border py-4"
                  >
                    <capability.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
                    <div>
                      <p className="font-display text-heading-md text-foreground">{capability.label}</p>
                      <p className="mt-0.5 text-body-sm text-muted-foreground">{capability.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative aspect-[4/5] max-w-md overflow-hidden rounded-md border border-border bg-muted lg:max-w-none">
              <Image
                src={`https://images.unsplash.com/${AFRICA_SECTION_IMAGE.src}?w=900&q=75&auto=format&fit=crop`}
                alt={AFRICA_SECTION_IMAGE.alt}
                fill
                sizes="(max-width: 1024px) 90vw, 400px"
                className="object-cover"
              />
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

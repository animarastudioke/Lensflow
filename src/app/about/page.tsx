import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'

export const metadata = {
  title: 'About',
  description: 'The premium platform for photographers and videographers to deliver, sell, and grow.',
}

export default function AboutPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Company"
        title="Built for photographers, by people who respect the craft"
      />
      <section className="page-section border-t border-border">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl space-y-6 text-body-lg text-muted-foreground">
            <p>
              LensFlow exists because photographers shouldn&apos;t need five different tools to run a
              studio. Galleries, bookings, contracts, payments, and a website all belong in one place —
              so the business side of photography takes less time, and the actual photography takes more.
            </p>
            <p>
              We&apos;re a small team building LensFlow one real studio workflow at a time, and we&apos;re
              still early. If something feels missing or broken, we want to hear about it.
            </p>
          </div>
        </div>
      </section>
      <MarketingCTA />
    </MarketingShell>
  )
}

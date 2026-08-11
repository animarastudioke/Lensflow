import { CheckCircle } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'

const highlights = [
  'Revenue, bookings, and gallery activity in one dashboard',
  'See which galleries and products clients engage with most',
  'Track studio performance over time, not just this month',
  'No spreadsheets — the numbers come straight from your real data',
]

export const metadata = {
  title: 'Analytics',
  description: 'Understand your studio at a glance — revenue, bookings, and gallery activity in one dashboard.',
}

export default function AnalyticsFeaturePage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Product"
        title="Analytics"
        description="Understand your studio at a glance — revenue, bookings, and gallery activity, all pulled from your real data."
      />
      <section className="page-section border-t border-border">
        <div className="container-wide">
          <ul className="mx-auto max-w-lg space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-body text-foreground">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" strokeWidth={1.5} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <MarketingCTA />
    </MarketingShell>
  )
}

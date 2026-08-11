import { CheckCircle } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'

const highlights = [
  'Real-time availability so clients can only book open slots',
  'Packages and mini-sessions with custom pricing',
  'Questionnaires and contracts sent automatically after booking',
  'Automated reminders so clients never miss a session',
]

export const metadata = {
  title: 'Booking',
  description: 'Availability, packages, mini-sessions, questionnaires, contracts, and automated reminders.',
}

export default function BookingFeaturePage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Product"
        title="Booking"
        description="Let clients book themselves in, collect what you need up front, and never chase a signature or a reminder again."
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

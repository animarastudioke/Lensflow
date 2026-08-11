import { CheckCircle } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'

const highlights = [
  'Responsive galleries that look great on any device',
  'Client proofing with favorites and comments',
  'Password protection and expiring share links',
  'Fast delivery, even for large full-resolution sets',
]

export const metadata = {
  title: 'Client Galleries',
  description: 'Deliver photos and videos in stunning, responsive galleries with proofing, favorites, and comments.',
}

export default function GalleriesFeaturePage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Product"
        title="Client Galleries"
        description="Deliver photos and videos in stunning, responsive galleries your clients will love opening — with proofing, favorites, and comments built in."
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

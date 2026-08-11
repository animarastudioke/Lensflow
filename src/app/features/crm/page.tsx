import { CheckCircle } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'

const highlights = [
  'One record per client — leads, projects, notes, and history together',
  'Custom fields and tags to match how your studio works',
  'Full activity history across bookings, invoices, and galleries',
  'Fast search across every client you have ever worked with',
]

export const metadata = {
  title: 'CRM',
  description: 'Manage clients, leads, projects, and notes with custom fields, tags, and activity history.',
}

export default function CrmFeaturePage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Product"
        title="CRM"
        description="Manage clients, leads, and projects with custom fields, tags, and a full activity history — so nothing about a client relationship gets lost."
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

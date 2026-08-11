import { CheckCircle } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'

const highlights = [
  'A portfolio website built from the work already in your studio',
  'Custom domain support, no separate hosting to manage',
  'Built-in SEO so your work is easier to find',
  'No-code page builder — no developer required',
]

export const metadata = {
  title: 'Website Builder',
  description: 'Build a beautiful portfolio website with a custom domain, SEO, and no-code page builder.',
}

export default function WebsiteFeaturePage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Product"
        title="Website Builder"
        description="Build a beautiful portfolio website with a custom domain, SEO, and a no-code page builder — without leaving LensFlow."
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

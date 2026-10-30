import { CheckCircle } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'

const highlights = [
  'Build a portfolio from the galleries already in your studio',
  'Arrange hero, story, photo gallery, and contact sections without code',
  'Choose a visual style, set your primary color, and add page titles for search',
  'Preview changes as you edit, then publish to your LensFlow portfolio URL',
]

export const metadata = {
  title: 'Website Builder',
  description: 'Build a photography portfolio from your LensFlow galleries with a live preview and no-code page sections.',
}

export default function WebsiteFeaturePage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Product"
        title="Website Builder"
        description="Build a photography portfolio from the galleries already in your studio. Arrange sections, choose a visual style, and preview as you edit — without leaving LensFlow."
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


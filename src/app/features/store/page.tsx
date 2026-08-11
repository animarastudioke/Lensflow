import { CheckCircle } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'

const highlights = [
  'Sell prints and digital downloads straight from a gallery',
  'Orders and fulfillment tracked alongside the rest of your studio',
  'Zero setup — no separate storefront or inventory system needed',
  'Multi-currency pricing for clients anywhere',
]

export const metadata = {
  title: 'Store',
  description: 'Sell prints and digital downloads directly from your galleries with zero setup.',
}

export default function StoreFeaturePage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Product"
        title="Store"
        description="Turn any gallery into a storefront. Clients buy prints and digital downloads right where they're already looking at their photos."
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

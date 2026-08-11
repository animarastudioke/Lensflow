import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'API Reference',
  description: 'API documentation for LensFlow.',
}

export default function ApiDocsPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Resources" title="API Reference" />
      <MarketingComingSoon note="A public API isn't available yet. If you're interested in integrating with LensFlow, let us know what you're building." />
    </MarketingShell>
  )
}

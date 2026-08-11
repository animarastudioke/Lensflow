import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'Documentation',
  description: 'Guides and documentation for using LensFlow.',
}

export default function DocsPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Resources" title="Documentation" />
      <MarketingComingSoon note="We're still writing full documentation. If you have a question about using LensFlow in the meantime, reach out and we'll help directly." />
    </MarketingShell>
  )
}

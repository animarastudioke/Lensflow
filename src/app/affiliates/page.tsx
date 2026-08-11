import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'Affiliates',
  description: 'LensFlow affiliate program.',
}

export default function AffiliatesPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Company" title="Affiliates" />
      <MarketingComingSoon note="An affiliate program isn't live yet. If you'd like to be notified when it launches, get in touch." />
    </MarketingShell>
  )
}

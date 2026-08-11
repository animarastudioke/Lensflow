import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'Partners',
  description: 'Partner with LensFlow.',
}

export default function PartnersPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Company" title="Partners" />
      <MarketingComingSoon note="We don't have a formal partner program yet. If you have an idea for a partnership, we'd like to hear it." />
    </MarketingShell>
  )
}

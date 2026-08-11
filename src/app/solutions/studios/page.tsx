import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'LensFlow for Studios',
  description: 'How LensFlow helps multi-photographer studios manage clients, bookings, and payments.',
}

export default function StudiosPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Solutions"
        title="Built for studios"
        description="A dedicated walkthrough for multi-photographer studios is on the way. In the meantime, explore the platform below."
      />
      <MarketingComingSoon note="This solutions page is still in progress. Get in touch and we'll show you how LensFlow fits your studio." />
    </MarketingShell>
  )
}

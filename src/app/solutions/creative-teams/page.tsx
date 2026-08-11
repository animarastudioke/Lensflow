import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'LensFlow for Creative Teams',
  description: 'How LensFlow helps creative teams collaborate on client work, bookings, and delivery.',
}

export default function CreativeTeamsPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Solutions"
        title="Built for creative teams"
        description="A dedicated walkthrough for creative teams is on the way. In the meantime, explore the platform below."
      />
      <MarketingComingSoon note="This solutions page is still in progress. Get in touch and we'll show you how LensFlow fits your team." />
    </MarketingShell>
  )
}

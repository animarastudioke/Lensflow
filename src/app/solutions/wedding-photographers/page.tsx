import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'LensFlow for Wedding Photographers',
  description: 'How LensFlow helps wedding photographers deliver galleries, book clients, and get paid.',
}

export default function WeddingPhotographersPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Solutions"
        title="Built for wedding photographers"
        description="A dedicated walkthrough for wedding studios is on the way. In the meantime, explore the platform below."
      />
      <MarketingComingSoon note="This solutions page is still in progress. Get in touch and we'll show you how LensFlow fits your wedding business." />
    </MarketingShell>
  )
}

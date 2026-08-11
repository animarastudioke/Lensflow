import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'LensFlow for Portrait Photographers',
  description: 'How LensFlow helps portrait photographers deliver galleries, book sessions, and get paid.',
}

export default function PortraitPhotographersPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Solutions"
        title="Built for portrait photographers"
        description="A dedicated walkthrough for portrait studios is on the way. In the meantime, explore the platform below."
      />
      <MarketingComingSoon note="This solutions page is still in progress. Get in touch and we'll show you how LensFlow fits your portrait business." />
    </MarketingShell>
  )
}

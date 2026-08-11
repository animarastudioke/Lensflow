import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'LensFlow for Videographers',
  description: 'How LensFlow helps videographers deliver video galleries, book clients, and get paid.',
}

export default function VideographersPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Solutions"
        title="Built for videographers"
        description="A dedicated walkthrough for video production businesses is on the way. In the meantime, explore the platform below."
      />
      <MarketingComingSoon note="This solutions page is still in progress. Get in touch and we'll show you how LensFlow fits your video business." />
    </MarketingShell>
  )
}

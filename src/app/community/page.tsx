import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'Community',
  description: 'Connect with other LensFlow photographers.',
}

export default function CommunityPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Resources" title="Community" />
      <MarketingComingSoon note="A community space for LensFlow photographers is on the way. Want to connect sooner? Reach out and we'll point you in the right direction." />
    </MarketingShell>
  )
}

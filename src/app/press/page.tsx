import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'Press',
  description: 'Press inquiries for LensFlow.',
}

export default function PressPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Company" title="Press" />
      <MarketingComingSoon note="We don't have a press kit published yet. For press inquiries, reach out and we'll follow up directly." />
    </MarketingShell>
  )
}

import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'Help Center',
  description: 'Get help with LensFlow.',
}

export default function HelpPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Resources" title="Help Center" />
      <MarketingComingSoon note="A searchable help center is coming. For now, email us directly and a real person will get back to you." />
    </MarketingShell>
  )
}

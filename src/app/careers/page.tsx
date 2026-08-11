import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'Careers',
  description: 'Careers at LensFlow.',
}

export default function CareersPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Company" title="Careers" />
      <MarketingComingSoon note="We don't have open roles listed right now. If you'd like to be considered for future opportunities, get in touch." />
    </MarketingShell>
  )
}

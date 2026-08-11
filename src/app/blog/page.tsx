import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { MarketingComingSoon } from '@/components/marketing/MarketingComingSoon'

export const metadata = {
  title: 'Blog',
  description: 'News and updates from LensFlow.',
}

export default function BlogPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Resources" title="Blog" />
      <MarketingComingSoon note="Nothing published here yet. Check back soon for product updates and stories from photographers using LensFlow." />
    </MarketingShell>
  )
}

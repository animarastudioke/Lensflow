import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { LegalDocument, LegalSection } from '@/components/marketing/LegalDocument'
import { APP_CONSTANTS } from '@/lib/constants'

export const metadata = {
  title: 'Data Processing Addendum',
  description: "LensFlow's Data Processing Addendum.",
}

export default function DpaPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Legal" title="Data Processing Addendum" />
      <LegalDocument lastUpdated="August 11, 2026">
        <LegalSection heading="What this covers">
          <p>
            A Data Processing Addendum (DPA) governs how LensFlow processes personal data on behalf of a
            studio using the platform, and is relevant if your studio needs one in place for its own
            compliance obligations (for example, under GDPR).
          </p>
        </LegalSection>

        <LegalSection heading="Requesting a DPA">
          <p>
            If your studio requires a signed DPA, email{' '}
            <a href={`mailto:${APP_CONSTANTS.SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {APP_CONSTANTS.SUPPORT_EMAIL}
            </a>{' '}
            and we&apos;ll get one in place with you.
          </p>
        </LegalSection>
      </LegalDocument>
    </MarketingShell>
  )
}

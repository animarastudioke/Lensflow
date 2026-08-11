import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { LegalDocument, LegalSection } from '@/components/marketing/LegalDocument'
import { APP_CONSTANTS } from '@/lib/constants'

export const metadata = {
  title: 'GDPR',
  description: "LensFlow's approach to GDPR.",
}

export default function GdprPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Legal" title="GDPR" />
      <LegalDocument lastUpdated="August 11, 2026">
        <LegalSection heading="Our commitment">
          <p>
            We&apos;re committed to handling personal data in line with the EU General Data Protection
            Regulation (GDPR) for users and clients in the European Economic Area.
          </p>
        </LegalSection>

        <LegalSection heading="Your rights">
          <p>If GDPR applies to you, you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Request a copy of your data in a portable format</li>
            <li>Object to or restrict certain processing</li>
          </ul>
        </LegalSection>

        <LegalSection heading="Studios as data controllers">
          <p>
            When a studio uses LensFlow to store and manage their clients&apos; information, the studio acts
            as the data controller for that information, and LensFlow acts as a data processor on their
            behalf.
          </p>
        </LegalSection>

        <LegalSection heading="Exercising your rights">
          <p>
            To exercise any of these rights, email{' '}
            <a href={`mailto:${APP_CONSTANTS.SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {APP_CONSTANTS.SUPPORT_EMAIL}
            </a>
            . If your data is held by a studio using LensFlow rather than by LensFlow directly, we&apos;ll
            help route your request appropriately.
          </p>
        </LegalSection>
      </LegalDocument>
    </MarketingShell>
  )
}

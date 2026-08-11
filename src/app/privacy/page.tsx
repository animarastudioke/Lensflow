import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { LegalDocument, LegalSection } from '@/components/marketing/LegalDocument'
import { APP_CONSTANTS } from '@/lib/constants'

export const metadata = {
  title: 'Privacy Policy',
  description: 'How LensFlow collects, uses, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Legal" title="Privacy Policy" />
      <LegalDocument lastUpdated="August 11, 2026">
        <LegalSection heading="Overview">
          <p>
            This policy describes how LensFlow collects, uses, and protects information when you use our
            platform — whether as a studio owner running your business on LensFlow, or as a client viewing
            a gallery a studio shared with you.
          </p>
        </LegalSection>

        <LegalSection heading="Information we collect">
          <p>We collect information you provide directly, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account details, such as your name and email address</li>
            <li>Studio and business information you add to your account</li>
            <li>Client, booking, invoice, and gallery data you create or upload</li>
            <li>Photos and files you upload for delivery to clients</li>
          </ul>
          <p>We also collect limited technical information automatically, such as device and usage data, to keep the platform reliable and secure.</p>
        </LegalSection>

        <LegalSection heading="How we use information">
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and operate the features you use</li>
            <li>To process payments and bookings on your behalf</li>
            <li>To communicate with you about your account or transactions</li>
            <li>To maintain the security and reliability of the platform</li>
          </ul>
        </LegalSection>

        <LegalSection heading="Sharing information">
          <p>
            We do not sell your information. We share information only with the third-party service
            providers necessary to operate LensFlow — for example, cloud hosting, payment processing, and
            email delivery — and only to the extent needed for them to perform that function.
          </p>
        </LegalSection>

        <LegalSection heading="Data retention">
          <p>
            We retain information for as long as your account is active, or as needed to provide the
            service. You can request deletion of your account and associated data at any time.
          </p>
        </LegalSection>

        <LegalSection heading="Your rights">
          <p>
            Depending on where you live, you may have the right to access, correct, export, or delete your
            personal information. To exercise any of these rights, contact us at{' '}
            <a href={`mailto:${APP_CONSTANTS.SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {APP_CONSTANTS.SUPPORT_EMAIL}
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection heading="Security">
          <p>
            We use industry-standard measures, including encryption in transit, to protect information on
            LensFlow. No system is completely secure, and we encourage you to use a strong, unique
            password for your account.
          </p>
        </LegalSection>

        <LegalSection heading="Children's privacy">
          <p>LensFlow is not directed at children under 16, and we do not knowingly collect information from them.</p>
        </LegalSection>

        <LegalSection heading="Changes to this policy">
          <p>
            We may update this policy from time to time. If we make material changes, we&apos;ll let you know
            through the app or by email.
          </p>
        </LegalSection>

        <LegalSection heading="Contact">
          <p>
            Questions about this policy? Email{' '}
            <a href={`mailto:${APP_CONSTANTS.SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {APP_CONSTANTS.SUPPORT_EMAIL}
            </a>
            .
          </p>
        </LegalSection>
      </LegalDocument>
    </MarketingShell>
  )
}

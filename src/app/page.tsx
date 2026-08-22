import type { Metadata } from 'next'
import { APP_CONSTANTS } from '@/lib/constants'
import { Navbar } from '@/components/marketing/navbar'
import { Footer } from '@/components/marketing/footer'
import { LIGHT_THEME_VARS } from '@/components/marketing/MarketingShell'
import { Hero } from '@/components/marketing/home/hero'
import { ValueStrip } from '@/components/marketing/home/value-strip'
import { ProblemSection } from '@/components/marketing/home/problem-section'
import { FeatureTabs } from '@/components/marketing/home/feature-tabs'
import { GalleryShowcase } from '@/components/marketing/home/gallery-showcase'
import { ClientJourney } from '@/components/marketing/home/client-journey'
import { AfricaSection } from '@/components/marketing/home/africa-section'
import { Pricing } from '@/components/marketing/home/pricing'
import { EarlyAccess } from '@/components/marketing/home/early-access'
import { Faq } from '@/components/marketing/home/faq'
import { FinalCta } from '@/components/marketing/home/final-cta'
import { HomeSessionRedirect } from '@/components/marketing/home/session-redirect'
import { FAQ_ITEMS } from '@/lib/constants/homepage'

const TITLE = 'LensFlow — The Business Platform for Photographers & Videographers'
const DESCRIPTION =
  'Run your photography or videography business from one beautiful platform. Deliver galleries, manage clients, book sessions, send invoices, accept M-Pesa payments, and grow your business with LensFlow.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: APP_CONSTANTS.URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_CONSTANTS.URL,
    siteName: 'LensFlow',
    title: TITLE,
    description: DESCRIPTION,
    // Image comes from opengraph-image.tsx (Next.js file-convention).
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    // No `creator` handle — not a verified LensFlow account.
  },
}

function StructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${APP_CONSTANTS.URL}/#organization`,
        name: 'LensFlow',
        url: APP_CONSTANTS.URL,
        logo: `${APP_CONSTANTS.URL}/apple-icon`,
      },
      {
        '@type': 'WebSite',
        '@id': `${APP_CONSTANTS.URL}/#website`,
        url: APP_CONSTANTS.URL,
        name: 'LensFlow',
        description: DESCRIPTION,
        publisher: { '@id': `${APP_CONSTANTS.URL}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'LensFlow',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: DESCRIPTION,
        url: APP_CONSTANTS.URL,
        offers: {
          '@type': 'Offer',
          category: 'SaaS subscription',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <HomeSessionRedirect />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="min-h-screen bg-background text-foreground" style={LIGHT_THEME_VARS}>
        <Navbar transparent />
        <main id="main-content">
          <Hero />
          <ValueStrip />
          <ProblemSection />
          <FeatureTabs />
          <GalleryShowcase />
          <ClientJourney />
          <AfricaSection />
          <Pricing />
          <EarlyAccess />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </>
  )
}

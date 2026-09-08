export interface PricingTier {
  id: string
  name: string
  /**
   * The price actually billed (matches plans.price_cents in the DB) — kept
   * as the secondary, smaller "≈ $X" figure since M-Pesa only ever settles
   * in KES.
   */
  priceUsd: number
  /**
   * Primary displayed price. A fixed literal, not computed at render time —
   * this is Kenya's primary market and KES is the currency actually charged,
   * so it's the number that should read as "the price." Set once per tier as
   * priceUsd * USD_TO_KES_RATE (see src/lib/currencies.ts) at the time this
   * was written; USD_TO_KES_RATE is itself a fixed approximation, not a live
   * feed, so revisit both of these together periodically (e.g. quarterly, or
   * whenever the real rate drifts noticeably) rather than expecting either
   * to auto-update.
   */
  priceKes: number
  storage: string
  description: string
  features: string[]
  cta: { label: string; href: string }
  highlighted?: boolean
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    priceKes: 0,
    storage: '3 GB storage',
    description: 'Try the gallery experience with no commitment.',
    features: [
      '1 active gallery',
      'View & favorite photos',
      'LensFlow branding on galleries',
      'No credit card required',
    ],
    cta: { label: 'Start for free', href: '/auth/signup' },
  },
  {
    id: 'starter',
    name: 'Starter',
    priceUsd: 12,
    priceKes: 1548,
    storage: '100 GB storage',
    description: 'Everything a solo photographer needs to run their business.',
    features: [
      'Unlimited galleries',
      'Full-resolution + bulk ZIP downloads',
      'No LensFlow branding',
      'Booking & availability',
      'CRM & client management',
      'Contracts & invoicing',
      'Accept payments (M-Pesa)',
    ],
    cta: { label: 'Get Starter', href: '/auth/signup' },
  },
  {
    id: 'studio',
    name: 'Studio',
    priceUsd: 29,
    priceKes: 3741,
    storage: '500 GB storage',
    description: 'For studios ready to sell more and build their brand.',
    features: [
      'Everything in Starter',
      'Online store — prints, albums, downloads',
      'Portfolio website builder',
      'Custom domain',
    ],
    cta: { label: 'Get Studio', href: '/auth/signup' },
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    priceUsd: 59,
    priceKes: 7611,
    storage: '1 TB storage',
    description: 'For growing studios with more than one photographer.',
    features: [
      'Everything in Studio',
      'Team seats & permissions (up to 5)',
      'Priority support',
    ],
    cta: { label: 'Get Team', href: '/auth/signup' },
  },
]

export const PRICING_FAQ = [
  {
    question: 'Is there a free plan?',
    answer:
      'Yes. LensFlow has a free plan with 3GB of storage so you can try client galleries at no cost — no credit card required. Paid plans unlock full-resolution downloads, booking, payments, and more storage as you grow.',
  },
  {
    question: 'Can I change plans later?',
    answer: 'Yes. Upgrade, downgrade, or cancel anytime from your account settings — changes apply on your next billing cycle.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'M-Pesa, for both your subscription and the payments you collect from clients. Support for card payments is on the roadmap.',
  },
  {
    question: 'Why does my M-PESA message say Animara Studio?',
    answer:
      'Animara Studio is LensFlow\'s parent business — it\'s the registered name behind our M-Pesa PayBill, so it\'s what shows up in the STK push prompt and confirmation SMS. Your payment is still going to LensFlow.',
  },
  {
    question: 'What happens if I go over my storage limit?',
    answer: 'We\'ll let you know before you hit your limit so you can upgrade or free up space — we won\'t delete your galleries.',
  },
]

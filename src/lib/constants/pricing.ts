export interface PricingTier {
  id: string
  name: string
  price: number
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
    price: 0,
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
    price: 12,
    storage: '50 GB storage',
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
    price: 29,
    storage: '250 GB storage',
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
    price: 59,
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
    question: 'What happens if I go over my storage limit?',
    answer: 'We\'ll let you know before you hit your limit so you can upgrade or free up space — we won\'t delete your galleries.',
  },
]

import type { LucideIcon } from 'lucide-react'
import {
  Image as ImageIcon,
  Calendar,
  Users,
  CreditCard,
  Store,
  Globe,
  Mail,
  Cloud,
  FileText,
  MessageSquare,
  ClipboardCheck,
  Send,
  Camera,
  Heart,
} from 'lucide-react'

export interface NavLink {
  label: string
  href: string
  description?: string
}

export const NAV_PRODUCT_LINKS: NavLink[] = [
  { label: 'Client Galleries', href: '/features/galleries', description: 'Deliver photos and videos beautifully' },
  { label: 'Proofing', href: '/features/galleries#proofing', description: 'Favorites, comments, and approvals' },
  { label: 'Booking', href: '/features/booking', description: 'Availability, packages, and contracts' },
  { label: 'CRM', href: '/features/crm', description: 'Clients, leads, and project timelines' },
  { label: 'Invoicing', href: '/features/analytics#payments', description: 'Quotes, invoices, and payments' },
  { label: 'Online Store', href: '/features/store', description: 'Prints, albums, and digital downloads' },
  { label: 'Website Builder', href: '/features/website', description: 'A portfolio site with your own domain' },
]

export const NAV_SOLUTIONS_LINKS: NavLink[] = [
  { label: 'Wedding Photographers', href: '/solutions/wedding-photographers' },
  { label: 'Portrait Photographers', href: '/solutions/portrait-photographers' },
  { label: 'Videographers', href: '/solutions/videographers' },
  { label: 'Studios', href: '/solutions/studios' },
  { label: 'Creative Teams', href: '/solutions/creative-teams' },
]

export const NAV_RESOURCES_LINKS: NavLink[] = [
  { label: 'Help Center', href: '/help' },
  { label: 'Blog', href: '/blog' },
  { label: 'Guides', href: '/docs' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
]

export const TRUST_INDICATORS = ['Photography', 'Videography', 'Studios', 'Creative Teams']

export interface DisconnectedTool {
  label: string
  icon: LucideIcon
}

export const DISCONNECTED_TOOLS: DisconnectedTool[] = [
  { label: 'Gallery host', icon: ImageIcon },
  { label: 'Calendar app', icon: Calendar },
  { label: 'Email inbox', icon: Mail },
  { label: 'Invoicing tool', icon: FileText },
  { label: 'Payment processor', icon: CreditCard },
  { label: 'Cloud storage', icon: Cloud },
]

export interface FeatureTab {
  id: string
  number: string
  label: string
  heading: string
  copy: string
  cta: { label: string; href: string }
}

export const FEATURE_TABS: FeatureTab[] = [
  {
    id: 'galleries',
    number: '01',
    label: 'Galleries',
    heading: "Deliver work they'll love opening.",
    copy: 'Create beautiful branded galleries that make your work feel as premium online as it does in person.',
    cta: { label: 'Explore galleries', href: '/features/galleries' },
  },
  {
    id: 'booking',
    number: '02',
    label: 'Booking',
    heading: 'Make booking effortless.',
    copy: 'Let clients see your availability, choose a session, complete their questionnaire, sign their contract, and pay — all in one flow.',
    cta: { label: 'See booking', href: '/features/booking' },
  },
  {
    id: 'crm',
    number: '03',
    label: 'CRM',
    heading: 'Know every client. Remember every detail.',
    copy: 'Track leads, projects, notes, and tasks in one timeline — nothing falls through the cracks.',
    cta: { label: 'See CRM', href: '/features/crm' },
  },
  {
    id: 'payments',
    number: '04',
    label: 'Payments',
    heading: 'Get paid without the back-and-forth.',
    copy: 'Send invoices, collect deposits, and track balances with the payment methods your clients already use.',
    cta: { label: 'See payments', href: '/features/analytics' },
  },
  {
    id: 'store',
    number: '05',
    label: 'Store',
    heading: 'Turn your galleries into another revenue stream.',
    copy: 'Sell prints, albums, wall art, and digital downloads directly from the gallery your clients are already browsing.',
    cta: { label: 'See the store', href: '/features/store' },
  },
  {
    id: 'websites',
    number: '06',
    label: 'Websites',
    heading: 'Your portfolio deserves more than a template.',
    copy: 'A portfolio, pricing page, and booking flow that all live on your own domain — built in, not bolted on.',
    cta: { label: 'See websites', href: '/features/website' },
  },
]

export interface JourneyStage {
  number: string
  label: string
  heading: string
  copy: string
  icon: LucideIcon
}

export const JOURNEY_STAGES: JourneyStage[] = [
  { number: '01', label: 'Inquiry', heading: 'A lead lands in your CRM', copy: 'Every inquiry — from your site, Instagram, or a referral — lands in one place, automatically.', icon: Mail },
  { number: '02', label: 'Booking', heading: 'They pick a date, you confirm it', copy: 'Clients see real availability and book a package without a single back-and-forth email.', icon: Calendar },
  { number: '03', label: 'Contract', heading: 'Signed before the shoot', copy: 'Contracts go out and come back signed, attached to the project automatically.', icon: FileText },
  { number: '04', label: 'Payment', heading: 'Deposit collected up front', copy: 'A deposit invoice is sent the moment the booking is confirmed — no chasing required.', icon: CreditCard },
  { number: '05', label: 'Shoot', heading: 'Session day, fully briefed', copy: 'Questionnaire answers, shot lists, and client notes are all in your pocket on the day.', icon: Camera },
  { number: '06', label: 'Proofing', heading: 'Clients pick their favorites', copy: 'Share a proofing gallery so clients can select and comment on the images they love.', icon: Heart },
  { number: '07', label: 'Delivery', heading: 'A gallery worth opening', copy: 'Final images and video are delivered in a branded gallery clients can download and share.', icon: ImageIcon },
  { number: '08', label: 'Follow-up', heading: 'The relationship keeps going', copy: 'Prints, albums, and referral requests go out automatically after delivery.', icon: Send },
]

export interface FaqItem {
  question: string
  answer: string
}

export const FAQ_ITEMS: FaqItem[] = [
  { question: 'What is LensFlow?', answer: 'LensFlow is a business platform for photographers and videographers. It brings client galleries, proofing, booking, CRM, contracts, invoicing, payments, an online store, and a portfolio website into one connected workspace.' },
  { question: 'Who is LensFlow for?', answer: 'Wedding and portrait photographers, videographers, studios, and creative teams who want to run their business without stitching together a dozen separate tools.' },
  { question: 'Can I deliver both photos and videos?', answer: 'Yes. Galleries support high-resolution photo and video delivery, with proofing and downloads for both.' },
  { question: 'Can clients download their images?', answer: 'Yes. You control whether clients can download full-resolution originals, web-sized copies, or nothing at all, per gallery.' },
  { question: 'Can clients select favorites?', answer: 'Yes. Clients can favorite and comment on images directly in the gallery, which makes proofing and album design faster.' },
  { question: 'Can I accept payments?', answer: 'Yes, via M-Pesa — invoice clients and collect deposits or full payment with a real-time STK push to their phone. Support for card payments is on the roadmap.' },
  { question: 'Can I create a portfolio website?', answer: 'Yes. The built-in website builder turns your galleries and pricing into a portfolio site, with no separate tool required.' },
  { question: 'Can I use my own domain?', answer: 'Yes. Connect a custom domain to your LensFlow website and client galleries.' },
  { question: 'Can I manage a team?', answer: 'Yes. Invite second shooters, editors, or studio managers with role-based permissions on your projects.' },
  { question: 'Can clients book sessions?', answer: 'Yes. Clients can see your availability, choose a package and time, and complete their booking online.' },
  { question: 'How much does LensFlow cost?', answer: 'Paid plans start at $12/month, with a free plan also available — see our pricing page for the full breakdown of what’s included at each tier.' },
  { question: 'Is there a free plan?', answer: 'Yes. LensFlow has a free plan with 3GB of storage so you can try client galleries at no cost — no credit card required. Paid plans unlock full-resolution downloads, booking, payments, and more storage as you grow.' },
]

export const PAYMENT_METHODS = [
  { label: 'M-Pesa', description: 'Mobile money, Kenya' },
]

export const STORE_PRODUCTS = [
  { id: 'print', label: 'Fine Art Print', category: 'Prints', price: 45, image: 'photo-1513519245088-0e12902e5a38' },
  { id: 'album', label: 'Heirloom Album', category: 'Albums', price: 320, image: 'photo-1606216794074-735e91aa2c92' },
  { id: 'wall-art', label: 'Canvas Wall Art', category: 'Wall Art', price: 180, image: 'photo-1582053433976-25c00369fc93' },
  { id: 'digital', label: 'Digital Download Pack', category: 'Digital', price: 65, image: 'photo-1516035069371-29a1b244cc32' },
]

export const CRM_CLIENTS = [
  {
    id: 'amara-otieno',
    name: 'Amara & David Otieno',
    project: 'Wedding — Lake Naivasha',
    status: 'In progress',
    nextAction: 'Send final gallery',
    timeline: [
      { label: 'Inquiry received', done: true },
      { label: 'Booked — Full Day package', done: true },
      { label: 'Contract signed', done: true },
      { label: 'Deposit paid', done: true },
      { label: 'Shoot completed', done: true },
      { label: 'Gallery delivery', done: false },
    ],
  },
  {
    id: 'james-mwangi',
    name: 'James Mwangi',
    project: 'Brand Portraits',
    status: 'Booked',
    nextAction: 'Send questionnaire',
    timeline: [
      { label: 'Inquiry received', done: true },
      { label: 'Booked — Studio session', done: true },
      { label: 'Contract signed', done: false },
      { label: 'Deposit paid', done: false },
      { label: 'Shoot completed', done: false },
      { label: 'Gallery delivery', done: false },
    ],
  },
  {
    id: 'nia-studio',
    name: 'Nia & Co. Studio',
    project: 'Product Video Campaign',
    status: 'Lead',
    nextAction: 'Follow up on proposal',
    timeline: [
      { label: 'Inquiry received', done: true },
      { label: 'Booked — Studio session', done: false },
      { label: 'Contract signed', done: false },
      { label: 'Deposit paid', done: false },
      { label: 'Shoot completed', done: false },
      { label: 'Gallery delivery', done: false },
    ],
  },
]

export const BOOKING_DEMO_TIMES = ['9:00 AM', '11:30 AM', '1:00 PM', '3:30 PM', '5:00 PM']

export const GALLERY_SHOWCASE_IMAGES = [
  { src: 'photo-1721401870202-8e2264ecced2', alt: 'Couple standing together outdoors' },
  { src: 'photo-1735052712464-9d24b69be5f5', alt: 'Bride and groom on a woodland path' },
  { src: 'photo-1611106211090-8f3c79eb8552', alt: 'Woman in a green and gold sari' },
  { src: 'photo-1614566957872-9548817a3298', alt: 'Grayscale portrait of a bride' },
  { src: 'photo-1735052712489-f45220126a0c', alt: 'Bride and groom walking down a path' },
  { src: 'photo-1571753217087-980e556e16ea', alt: 'Bride and groom about to kiss' },
  { src: 'photo-1583939003579-730e3918a45a', alt: 'Wedding recessional with confetti' },
  { src: 'photo-1522673607200-164d1b6ce486', alt: 'Ceremony chairs decorated with flowers' },
]

export const HERO_IMAGE = {
  src: 'photo-1554080353-a576cf803bda',
  alt: 'A photographer framing a shot with her camera on a city rooftop at dusk',
}

export const AFRICA_SECTION_IMAGE = {
  src: 'photo-1573497491765-dccce02b29df',
  alt: 'Portrait of a photographer smiling, wearing traditional print fabric',
}

export const PRICING_COMPARISON = {
  before: [
    'Gallery hosting subscription',
    'Calendar / booking tool',
    'CRM or spreadsheet',
    'E-signature tool for contracts',
    'Invoicing software',
    'Online store platform',
    'Website builder',
  ],
  after: ['One LensFlow subscription — everything included'],
}

export const PRODUCT_ICONS = {
  ImageIcon,
  Calendar,
  Users,
  CreditCard,
  Store,
  Globe,
  MessageSquare,
  ClipboardCheck,
}

import type { TemplateStarterPage } from './templates'
import type { WebsiteSection } from './types'

// A new site should arrive finished enough to edit rather than fill in: five
// pages with real sentences, the portfolio split into two sub-pages, and
// examples of testimonials and packages. Photos are preview-only samples (see
// sample-media.ts). Testimonials and pricing are marked `sample` because they
// would otherwise publish invented clients and invented rates; they stay
// hidden from visitors until the studio edits them. No contact details or
// links are seeded: the only call-to-action targets are in-page anchors.

export interface StarterCopy {
  hero: { eyebrow: string; body: string; cta: string }
  portfolio: { homeHeading: string; pageHeading: string; intro: string; children: [PortfolioChild, PortfolioChild] }
  services: { homeHeading: string; items: [Offering, Offering, Offering] }
  testimonials: { heading: string; items: [Quote, Quote] }
  home: { contactHeading: string; contactBody: string }
  about: { eyebrow: string; heading: (name: string) => string; lead: string; storyHeading: string; story: string; approachHeading: string; approach: string }
  servicesPage: { heading: string; intro: string; items: [Offering, Offering, Offering]; pricingHeading: string; pricingIntro: string; tiers: [Tier, Tier, Tier] }
  contact: { heading: string; body: string; nextHeading: string; next: string }
}

interface Offering { title: string; description: string }
interface Quote { quote: string; author: string }
interface Tier { name: string; price: string; description: string }
interface PortfolioChild { slug: string; name: string; heading: string; intro: string }

const section = <T extends WebsiteSection>(value: T): T => value

export function buildStarterPages(copy: StarterCopy, name: string): TemplateStarterPage[] {
  const [firstChild, secondChild] = copy.portfolio.children
  const childPage = (child: PortfolioChild): TemplateStarterPage => ({
    name: child.name,
    path: `/portfolio/${child.slug}`,
    sections: [
      section({ id: 'intro', type: 'text', heading: child.heading, body: child.intro }),
      section({ id: 'gallery', type: 'gallery', heading: child.name, galleryId: '' }),
    ],
  })

  return [
    {
      name: 'Home',
      path: '/',
      sections: [
        section({ id: 'hero', type: 'hero', eyebrow: copy.hero.eyebrow, heading: name, body: copy.hero.body, ctaLabel: copy.hero.cta, ctaHref: '#contact', galleryId: '' }),
        section({ id: 'portfolio', type: 'gallery', heading: copy.portfolio.homeHeading, galleryId: '' }),
        section({ id: 'services', type: 'services', heading: copy.services.homeHeading, items: [...copy.services.items] }),
        section({ id: 'testimonials', type: 'testimonials', heading: copy.testimonials.heading, sample: true, items: [...copy.testimonials.items] }),
        section({ id: 'contact', type: 'contact', heading: copy.home.contactHeading, body: copy.home.contactBody }),
      ],
    },
    {
      name: 'Portfolio',
      path: '/portfolio',
      sections: [
        section({ id: 'intro', type: 'text', heading: copy.portfolio.pageHeading, body: copy.portfolio.intro }),
        section({ id: 'gallery', type: 'gallery', heading: 'Recent work', galleryId: '' }),
      ],
    },
    childPage(firstChild),
    childPage(secondChild),
    {
      name: 'About',
      path: '/about',
      sections: [
        section({ id: 'hero', type: 'hero', eyebrow: copy.about.eyebrow, heading: copy.about.heading(name), body: copy.about.lead, galleryId: '' }),
        section({ id: 'story', type: 'text', heading: copy.about.storyHeading, body: copy.about.story }),
        section({ id: 'approach', type: 'text', heading: copy.about.approachHeading, body: copy.about.approach }),
      ],
    },
    {
      name: 'Services',
      path: '/services',
      sections: [
        section({ id: 'intro', type: 'text', heading: copy.servicesPage.heading, body: copy.servicesPage.intro }),
        section({ id: 'services', type: 'services', heading: 'What is included', items: [...copy.servicesPage.items] }),
        section({ id: 'pricing', type: 'pricing', heading: copy.servicesPage.pricingHeading, body: copy.servicesPage.pricingIntro, sample: true, items: [...copy.servicesPage.tiers] }),
      ],
    },
    {
      name: 'Contact',
      path: '/contact',
      sections: [
        section({ id: 'contact', type: 'contact', heading: copy.contact.heading, body: copy.contact.body }),
        section({ id: 'next', type: 'text', heading: copy.contact.nextHeading, body: copy.contact.next }),
      ],
    },
  ]
}

const STEPS = 'We reply within a day, agree the details and the date, then plan the shoot together. After the shoot you receive a first look quickly, followed by the finished set.'

export const MODERN_MINIMAL_COPY: StarterCopy = {
  hero: { eyebrow: 'Photography', body: 'Clean, honest photographs of people, places and moments, made without fuss.', cta: 'Start a project' },
  portfolio: {
    homeHeading: 'Selected work',
    pageHeading: 'A look at recent work',
    intro: 'A small selection from recent shoots. Open a collection to see more, or get in touch about something specific.',
    children: [
      { slug: 'portraits', name: 'Portraits', heading: 'Portraits', intro: 'Natural portraits for individuals, couples and families, made in relaxed light.' },
      { slug: 'events', name: 'Events', heading: 'Events', intro: 'Coverage that follows the day as it happens and keeps the moments that mattered.' },
    ],
  },
  services: {
    homeHeading: 'How we can help',
    items: [
      { title: 'Portraits', description: 'Personal and professional portraits, in studio or on location.' },
      { title: 'Events', description: 'Photography for celebrations, launches and gatherings of any size.' },
      { title: 'Brand and product', description: 'Clear imagery for businesses, teams and the things they make.' },
    ],
  },
  testimonials: {
    heading: 'Kind words',
    items: [
      { quote: 'Easy to work with, and the photographs were better than we hoped for.', author: 'Client name' },
      { quote: 'Calm, professional and quick. We would book again without thinking twice.', author: 'Client name' },
    ],
  },
  home: { contactHeading: 'Let’s talk about your project.', contactBody: 'Share what you have in mind and the dates you are considering.' },
  about: {
    eyebrow: 'About',
    heading: (name) => `The people behind ${name}`,
    lead: 'A short introduction goes here: who you are, where you work and the kind of photographs you love making.',
    storyHeading: 'How it started',
    story: 'Tell the story in two or three short paragraphs. Where you began, what you shoot, and what keeps you doing it.',
    approachHeading: 'How we work',
    approach: 'Explain what clients can expect: a relaxed conversation first, a plan for the shoot, and a clear timeline for when the photographs arrive.',
  },
  servicesPage: {
    heading: 'Services',
    intro: 'Describe the kinds of work you take on and who it is for. Keep it to a short paragraph.',
    items: [
      { title: 'Planning', description: 'A short call to agree the look, the location and the schedule.' },
      { title: 'The shoot', description: 'Unhurried coverage with direction when you want it and none when you do not.' },
      { title: 'Delivery', description: 'A private online gallery with your edited photographs, ready to download.' },
    ],
    pricingHeading: 'Packages',
    pricingIntro: 'These are examples. Replace them with your own packages and prices.',
    tiers: [
      { name: 'Essential', price: 'KES 25,000', description: 'A short session with a selection of edited photographs.' },
      { name: 'Standard', price: 'KES 45,000', description: 'A longer session with more locations and a larger edited set.' },
      { name: 'Full day', price: 'KES 80,000', description: 'Coverage from start to finish with every keeper edited.' },
    ],
  },
  contact: { heading: 'Get in touch.', body: 'Tell us about the shoot, where it is and when you would like it.', nextHeading: 'What happens next', next: STEPS },
}

export const ELEGANT_WEDDING_COPY: StarterCopy = {
  hero: { eyebrow: 'Weddings and celebrations', body: 'Honest, unhurried photographs of your day as it unfolded.', cta: 'Enquire about your date' },
  portfolio: {
    homeHeading: 'Recent weddings',
    pageHeading: 'Weddings we have loved',
    intro: 'Each wedding is different. Here are a few days we were lucky to be part of.',
    children: [
      { slug: 'weddings', name: 'Weddings', heading: 'Wedding days', intro: 'From getting ready to the last dance, the moments you will want to look back on.' },
      { slug: 'engagements', name: 'Engagements', heading: 'Engagement sessions', intro: 'A relaxed session before the day, so you feel at ease in front of the camera.' },
    ],
  },
  services: {
    homeHeading: 'How we can help',
    items: [
      { title: 'Wedding day', description: 'Coverage planned around your timeline, from getting ready to the celebration.' },
      { title: 'Engagement session', description: 'A relaxed session before the day, so you are comfortable in front of the camera.' },
      { title: 'Albums and prints', description: 'Ways to keep your photographs beyond the screen.' },
    ],
  },
  testimonials: {
    heading: 'From our couples',
    items: [
      { quote: 'We forgot the camera was there, and somehow it caught everything.', author: 'Couple name' },
      { quote: 'Our families still talk about how kind and calm they were all day.', author: 'Couple name' },
    ],
  },
  home: { contactHeading: 'Tell us about your day.', contactBody: 'Share your date, venue and the kind of day you are imagining.' },
  about: {
    eyebrow: 'Our story',
    heading: (name) => `The people behind ${name}`,
    lead: 'Introduce yourselves warmly: who you are, how long you have photographed weddings and what you love about them.',
    storyHeading: 'Why weddings',
    story: 'Share what draws you to weddings and the kind of day you photograph best. Two or three short paragraphs is plenty.',
    approachHeading: 'How we work with couples',
    approach: 'Describe the journey from the first message to the finished album: a conversation about your day, a plan for the timeline and a gentle presence on the day itself.',
  },
  servicesPage: {
    heading: 'Wedding collections',
    intro: 'Describe how you cover a wedding and what couples can add. Keep it simple and warm.',
    items: [
      { title: 'Before the day', description: 'A call to talk through your plans, and an engagement session if you would like one.' },
      { title: 'On the day', description: 'Quiet, attentive coverage that lets you enjoy it while we capture it.' },
      { title: 'After the day', description: 'A private gallery to share with family, and albums if you want them.' },
    ],
    pricingHeading: 'Collections',
    pricingIntro: 'These are examples. Replace them with your own collections and prices.',
    tiers: [
      { name: 'Ceremony', price: 'KES 60,000', description: 'Coverage of the ceremony and the portraits that follow.' },
      { name: 'Wedding day', price: 'KES 120,000', description: 'From getting ready to the reception, with a second photographer.' },
      { name: 'Weekend', price: 'KES 200,000', description: 'Engagement session, wedding day coverage and a printed album.' },
    ],
  },
  contact: { heading: 'Say hello.', body: 'Share your wedding date and location and we will get back to you.', nextHeading: 'What happens next', next: STEPS },
}

export const BOLD_EDITORIAL_COPY: StarterCopy = {
  hero: { eyebrow: 'Photography and film', body: 'Strong images made for people who want their story told with confidence.', cta: 'Start a project' },
  portfolio: {
    homeHeading: 'Selected work',
    pageHeading: 'Work that made noise',
    intro: 'Campaigns, launches and nights worth remembering. Pick a collection to see how we shoot.',
    children: [
      { slug: 'events', name: 'Events', heading: 'Events', intro: 'Fast, loud and unmissable. Coverage that feels like being there.' },
      { slug: 'campaigns', name: 'Campaigns', heading: 'Campaigns', intro: 'Concept-led imagery for brands that want to be seen.' },
    ],
  },
  services: {
    homeHeading: 'What we do',
    items: [
      { title: 'Photography', description: 'Striking stills for events, brands and people with something to say.' },
      { title: 'Video', description: 'Short films and highlights that move as fast as the story does.' },
      { title: 'Custom projects', description: 'Bring us a brief and we will shape the approach around it.' },
    ],
  },
  testimonials: {
    heading: 'What clients say',
    items: [
      { quote: 'They understood the brief in one meeting and delivered more than we asked for.', author: 'Client name, brand' },
      { quote: 'Sharp, fast and a pleasure on set. The images carried our whole campaign.', author: 'Client name, agency' },
    ],
  },
  home: { contactHeading: 'Have a project in mind?', contactBody: 'Tell us what you are making and when you need it.' },
  about: {
    eyebrow: 'Who we are',
    heading: (name) => `${name}: the team`,
    lead: 'Say who you are in a sentence or two, with a bit of attitude. What you shoot and why it matters.',
    storyHeading: 'The short version',
    story: 'Tell the story of the studio: where it started, the work you are proudest of and where you are headed.',
    approachHeading: 'How we work',
    approach: 'Explain your process: the brief, the plan, the shoot and how fast clients get their images back.',
  },
  servicesPage: {
    heading: 'Services',
    intro: 'Lay out what you offer and how clients can combine it. Short and direct works best here.',
    items: [
      { title: 'Concept and planning', description: 'We turn a brief into a shot list and a schedule.' },
      { title: 'Production', description: 'A crew that arrives prepared and keeps the day moving.' },
      { title: 'Post and delivery', description: 'Edited, graded and delivered in the formats you need.' },
    ],
    pricingHeading: 'Packages',
    pricingIntro: 'These are examples. Replace them with your own packages and prices.',
    tiers: [
      { name: 'Half day', price: 'KES 50,000', description: 'A focused shoot with a tight set of final images.' },
      { name: 'Full day', price: 'KES 95,000', description: 'A full day of production with a larger final set.' },
      { name: 'Campaign', price: 'On request', description: 'Multi-day work with photo and video, quoted to the brief.' },
    ],
  },
  contact: { heading: 'Let’s work together.', body: 'Share a short brief and your preferred dates.', nextHeading: 'What happens next', next: STEPS },
}

export const SOFT_PORTRAIT_COPY: StarterCopy = {
  hero: { eyebrow: 'Portraits and family sessions', body: 'Relaxed sessions and natural photographs of the people who matter most to you.', cta: 'Book a session' },
  portfolio: {
    homeHeading: 'Recent sessions',
    pageHeading: 'Sessions we have loved',
    intro: 'A few favourite sessions. Every family is different, and every set of photographs is too.',
    children: [
      { slug: 'family', name: 'Family', heading: 'Family sessions', intro: 'Time together, photographed the way you actually are.' },
      { slug: 'milestones', name: 'Milestones', heading: 'Milestones', intro: 'Birthdays, graduations and the occasions worth remembering.' },
    ],
  },
  services: {
    homeHeading: 'Sessions',
    items: [
      { title: 'Family', description: 'A relaxed session for the whole family, at a place that suits you.' },
      { title: 'Portraits', description: 'Individual or couple portraits for personal or professional use.' },
      { title: 'Milestones', description: 'Photographs for birthdays, graduations and other occasions worth remembering.' },
    ],
  },
  testimonials: {
    heading: 'Kind words',
    items: [
      { quote: 'The children were completely at ease, and so were we. The photographs feel like us.', author: 'Family name' },
      { quote: 'Patient, warm and so good with our little one. We treasure every picture.', author: 'Parent name' },
    ],
  },
  home: { contactHeading: 'Let’s plan your session.', contactBody: 'Tell us who the session is for and when you would like it.' },
  about: {
    eyebrow: 'Hello',
    heading: (name) => `Hello, we are ${name}`,
    lead: 'Say hello in your own voice: who you are and what a session with you feels like.',
    storyHeading: 'Our story',
    story: 'Share a little about yourself, your family if you like, and why you love photographing people.',
    approachHeading: 'What a session feels like',
    approach: 'Describe the day: where you meet, how you put people at ease and when the photographs arrive.',
  },
  servicesPage: {
    heading: 'Sessions',
    intro: 'Explain the sessions you offer and who they suit. A short, friendly paragraph is enough.',
    items: [
      { title: 'Before', description: 'A chat about what you would like and where we should meet.' },
      { title: 'The session', description: 'Easy, playful and never rushed, whatever the age of the people in front of the camera.' },
      { title: 'After', description: 'A private gallery of your favourites, ready to share and print.' },
    ],
    pricingHeading: 'Session options',
    pricingIntro: 'These are examples. Replace them with your own sessions and prices.',
    tiers: [
      { name: 'Mini', price: 'KES 15,000', description: 'A short session with a handful of edited photographs.' },
      { name: 'Classic', price: 'KES 30,000', description: 'An hour together and a full gallery of edited photographs.' },
      { name: 'Extended', price: 'KES 50,000', description: 'Two locations, more time and a printed keepsake.' },
    ],
  },
  contact: { heading: 'Get in touch.', body: 'Share who the session is for, where you are and when you would like it.', nextHeading: 'What happens next', next: STEPS },
}

export const CLEAN_COMMERCIAL_COPY: StarterCopy = {
  hero: { eyebrow: 'Commercial and brand photography', body: 'Clear, well-lit imagery for products, teams and brands.', cta: 'Request a quote' },
  portfolio: {
    homeHeading: 'Selected work',
    pageHeading: 'Recent commissions',
    intro: 'Images made to sell, explain and represent. Open a collection to see more.',
    children: [
      { slug: 'product', name: 'Product', heading: 'Product photography', intro: 'Clean, consistent images that show what you sell at its best.' },
      { slug: 'brand-and-team', name: 'Brand and team', heading: 'Brand and team', intro: 'Portraits and lifestyle imagery that give a business a face.' },
    ],
  },
  services: {
    homeHeading: 'Services',
    items: [
      { title: 'Product', description: 'Catalogue, e-commerce and hero images for what you sell.' },
      { title: 'Brand and team', description: 'Portraits, lifestyle and behind-the-scenes imagery.' },
      { title: 'Events', description: 'Coverage of launches, conferences and corporate occasions.' },
    ],
  },
  testimonials: {
    heading: 'Client feedback',
    items: [
      { quote: 'Reliable, on brief and on time. Our catalogue has never looked better.', author: 'Client name, company' },
      { quote: 'They made our whole team look good, which is not easy. Highly recommended.', author: 'Client name, company' },
    ],
  },
  home: { contactHeading: 'Briefing a shoot?', contactBody: 'Send the scope, the usage you need and your timeline.' },
  about: {
    eyebrow: 'About',
    heading: (name) => `About ${name}`,
    lead: 'Introduce the studio in a sentence or two: what you shoot, who for and what makes you dependable.',
    storyHeading: 'Experience',
    story: 'List the kinds of clients and projects you have worked on, in plain language.',
    approachHeading: 'Process',
    approach: 'Explain how a commission runs: brief, quote, shoot, delivery, and how revisions work.',
  },
  servicesPage: {
    heading: 'Services',
    intro: 'Set out what you offer and how clients can order it. Be specific about usage and turnaround.',
    items: [
      { title: 'Brief and quote', description: 'We agree the scope, the usage and the schedule up front.' },
      { title: 'Shoot', description: 'Studio or on location, with the styling and lighting the brief needs.' },
      { title: 'Delivery', description: 'Retouched files in the sizes and formats you specify.' },
    ],
    pricingHeading: 'Pricing',
    pricingIntro: 'These are examples. Replace them with your own pricing, or say that you quote per brief.',
    tiers: [
      { name: 'Per product', price: 'KES 3,500', description: 'A set number of angles per item, on a clean background.' },
      { name: 'Half day', price: 'KES 60,000', description: 'A half day on location or in studio with retouching included.' },
      { name: 'Retainer', price: 'On request', description: 'Regular shoots for brands that need a steady flow of imagery.' },
    ],
  },
  contact: { heading: 'Request a quote.', body: 'Tell us about the shoot, how the images will be used and when you need them.', nextHeading: 'What happens next', next: STEPS },
}

export const CINEMATIC_REEL_COPY: StarterCopy = {
  hero: { eyebrow: 'Film and video', body: 'Moving pictures with a considered eye for light, sound and story.', cta: 'Discuss your film' },
  portfolio: {
    homeHeading: 'Stills from recent films',
    pageHeading: 'Recent films',
    intro: 'Stills and frames from recent work. Open a collection to see more of how we tell stories.',
    children: [
      { slug: 'wedding-films', name: 'Wedding films', heading: 'Wedding films', intro: 'Short films that keep the feeling of the day, not just the facts of it.' },
      { slug: 'brand-films', name: 'Brand films', heading: 'Brand films', intro: 'Stories for businesses, told with the care of a documentary.' },
    ],
  },
  services: {
    homeHeading: 'What we make',
    items: [
      { title: 'Highlight films', description: 'Short films for weddings and events that people watch again and again.' },
      { title: 'Brand films', description: 'Story-led video for businesses and organisations.' },
      { title: 'Edits and delivery', description: 'Editing, colour and sound, delivered in the formats you need.' },
    ],
  },
  testimonials: {
    heading: 'In their words',
    items: [
      { quote: 'We cried watching it. It is exactly how the day felt.', author: 'Client name' },
      { quote: 'Thoughtful from the first call to the final cut. Our film does the job and then some.', author: 'Client name, company' },
    ],
  },
  home: { contactHeading: 'Have a film in mind?', contactBody: 'Tell us about the story, the location and the dates you are considering.' },
  about: {
    eyebrow: 'Behind the camera',
    heading: (name) => `The crew at ${name}`,
    lead: 'Introduce yourselves: who is behind the camera, what you make and the stories you are drawn to.',
    storyHeading: 'Our approach to story',
    story: 'Share what you look for in a story and how you find it on the day.',
    approachHeading: 'From first call to final cut',
    approach: 'Explain the steps: the conversation, the shoot, the edit, the review round and the delivery.',
  },
  servicesPage: {
    heading: 'What we make',
    intro: 'Describe the films you make and what is involved. Short and visual works best.',
    items: [
      { title: 'Story and planning', description: 'We agree the story, the style and the schedule before we shoot.' },
      { title: 'Filming', description: 'A small, quiet crew that stays out of the way and finds the moments.' },
      { title: 'Edit and delivery', description: 'Cut, graded and mixed, with a review round before the final film.' },
    ],
    pricingHeading: 'Film packages',
    pricingIntro: 'These are examples. Replace them with your own packages and prices.',
    tiers: [
      { name: 'Highlight', price: 'KES 70,000', description: 'A short highlight film from a single day of filming.' },
      { name: 'Feature', price: 'KES 130,000', description: 'A longer film with speeches and full audio, plus a highlight.' },
      { name: 'Brand story', price: 'On request', description: 'A commissioned film, quoted to the story and the schedule.' },
    ],
  },
  contact: { heading: 'Let’s talk about your film.', body: 'Share the story, the location and your preferred dates.', nextHeading: 'What happens next', next: STEPS },
}

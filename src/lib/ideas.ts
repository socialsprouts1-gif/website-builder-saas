/**
 * Worked examples: what a site for a given kind of business should contain, and
 * a design direction to build it in.
 *
 * These are not seeded projects. Each one renders as a real miniature layout in
 * the browser (see SiteMock), so a client can see the shape and the palette
 * before spending a credit — and "Use this idea" hands the direction to the
 * generator as part of the prompt, so what gets built matches what was shown.
 */

export type Archetype = 'editorial' | 'grid' | 'split' | 'poster' | 'catalog' | 'directory';

export interface Palette {
  /** Page background. */
  bg: string;
  /** Cards and bands that sit on the background. */
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  /** Text on the accent colour. */
  accentInk: string;
}

export interface DesignDirection {
  name: string;
  mood: string;
  palette: Palette;
  display: string;
  body: string;
  archetype: Archetype;
}

export interface ShowcaseItem {
  label: string;
  /** A price, a date, whatever that trade puts next to a thing. */
  meta?: string;
}

export interface Idea {
  slug: string;
  business: string;
  /** Matches a CATEGORIES slug so the filter rail can reuse the same labels. */
  category: string;
  headline: string;
  tagline: string;
  /** Short nav labels — what sits along the top of the page. */
  nav: string[];
  cta: string;
  /** The pages and blocks this kind of business actually needs. */
  sections: string[];
  /**
   * The things a grid or list layout actually shows. A photographer's grid
   * holds weddings, not the words "Packages" and "Enquiry form" — without
   * this the catalog and directory mocks read as filler.
   */
  showcase?: ShowcaseItem[];
  direction: DesignDirection;
}

/** System stacks only — the mock must render identically with no font to load. */
const SERIF = 'Georgia, "Times New Roman", serif';
const GROTESK = 'system-ui, "Segoe UI", Helvetica, Arial, sans-serif';
const HUMANIST = '"Trebuchet MS", "Lucida Grande", system-ui, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

export const IDEAS: Idea[] = [
  {
    slug: 'bistro',
    business: 'Neighbourhood restaurant',
    category: 'restaurant',
    headline: 'Dinner, six nights a week',
    tagline: 'Seasonal plates, a short list, no fuss',
    nav: ['Menu', 'Book', 'The room'],
    cta: 'Reserve',
    sections: ['Menu that changes', 'Book a table', 'The room', 'Opening hours', 'Find us'],
    direction: {
      name: 'Candlelit editorial',
      mood: 'Warm, unhurried, a little formal',
      palette: {
        bg: '#141110',
        surface: '#1E1917',
        ink: '#F4EFE8',
        muted: '#A2968A',
        accent: '#D9A05B',
        accentInk: '#221A12',
      },
      display: SERIF,
      body: HUMANIST,
      archetype: 'editorial',
    },
  },
  {
    slug: 'gym',
    business: 'Strength gym',
    category: 'gym',
    headline: 'Get strong. Stay strong.',
    tagline: 'Coached barbell training, six days a week',
    nav: ['Timetable', 'Coaches', 'Pricing'],
    cta: 'Free trial',
    sections: ['Class timetable', 'Meet the coaches', 'Membership pricing', 'Free trial signup'],
    direction: {
      name: 'High-contrast athletic',
      mood: 'Loud, confident, built for a phone in a gym',
      palette: {
        bg: '#0B0B0C',
        surface: '#161618',
        ink: '#FFFFFF',
        muted: '#8A8A90',
        accent: '#D7FF3E',
        accentInk: '#0B0B0C',
      },
      display: GROTESK,
      body: GROTESK,
      archetype: 'poster',
    },
  },
  {
    slug: 'salon',
    business: 'Hair salon',
    category: 'salon',
    headline: 'A cut that grows out well',
    tagline: 'Colour, cutting and care in the old quarter',
    nav: ['Services', 'Stylists', 'Gallery'],
    cta: 'Book now',
    sections: ['Price list', 'Stylist profiles', 'Book online', 'Before and after gallery'],
    direction: {
      name: 'Soft boutique',
      mood: 'Calm, tactile, expensive without shouting',
      palette: {
        bg: '#F6F1EC',
        surface: '#FFFFFF',
        ink: '#2B2622',
        muted: '#8C8079',
        accent: '#B4705A',
        accentInk: '#FFFFFF',
      },
      display: SERIF,
      body: HUMANIST,
      archetype: 'split',
    },
  },
  {
    slug: 'dental',
    business: 'Dental clinic',
    category: 'dentist',
    headline: 'Dentistry without the dread',
    tagline: 'Family care, same-day emergencies',
    nav: ['Treatments', 'Fees', 'Our team'],
    cta: 'Book a visit',
    sections: ['Treatments explained', 'Fees and insurance', 'Book an appointment', 'Meet the dentists'],
    direction: {
      name: 'Clinical calm',
      mood: 'Reassuring, plain-spoken, nothing clever',
      palette: {
        bg: '#FBFDFE',
        surface: '#EFF6F9',
        ink: '#12303C',
        muted: '#5E7C88',
        accent: '#128C8C',
        accentInk: '#FFFFFF',
      },
      display: HUMANIST,
      body: HUMANIST,
      archetype: 'grid',
    },
  },
  {
    slug: 'photographer',
    business: 'Wedding photographer',
    category: 'photographer',
    headline: 'The day, as it happened',
    tagline: 'Documentary wedding photography',
    nav: ['Weddings', 'Packages', 'About'],
    cta: 'Enquire',
    sections: ['Galleries by wedding', 'Packages', 'How it works', 'Enquiry form'],
    showcase: [
      { label: 'Priya & Arjun', meta: 'Udaipur, February' },
      { label: 'Meera & Sam', meta: 'Goa, November' },
      { label: 'Anika & Dev', meta: 'Coorg, January' },
      { label: 'Ruth & Elias', meta: 'Kochi, August' },
      { label: 'Tara & Nikhil', meta: 'Jaipur, December' },
      { label: 'Lila & Ben', meta: 'Alibaug, October' },
      { label: 'Sana & Omar', meta: 'Hyderabad, March' },
      { label: 'Iris & Jonah', meta: 'Munnar, June' },
    ],
    direction: {
      name: 'Gallery-first',
      mood: 'Quiet frame, the work does the talking',
      palette: {
        bg: '#0E0E0E',
        surface: '#181818',
        ink: '#F2F2F2',
        muted: '#8E8E8E',
        accent: '#E8E2D4',
        accentInk: '#141414',
      },
      display: SERIF,
      body: GROTESK,
      archetype: 'catalog',
    },
  },
  {
    slug: 'roaster',
    business: 'Coffee roaster shop',
    category: 'ecommerce',
    headline: 'Roasted Tuesday, with you Thursday',
    tagline: 'Small-batch beans and a subscription',
    nav: ['Beans', 'Subscribe', 'Brew guides'],
    cta: 'Basket',
    sections: ['Product pages', 'Subscription plans', 'Brew guides', 'Cart and checkout'],
    showcase: [
      { label: 'Ethiopia Guji', meta: '₹720 / 250g' },
      { label: 'House Blend', meta: '₹480 / 250g' },
      { label: 'Colombia Huila', meta: '₹640 / 250g' },
      { label: 'Decaf Swiss Water', meta: '₹560 / 250g' },
      { label: 'Espresso Roast', meta: '₹520 / 250g' },
      { label: 'Monsoon Malabar', meta: '₹450 / 250g' },
      { label: 'Cold brew bags', meta: '₹390 / 6' },
      { label: 'Filter starter kit', meta: '₹1,850' },
    ],
    direction: {
      name: 'Warm retail',
      mood: 'Friendly, appetising, easy to scan',
      palette: {
        bg: '#FFF9F2',
        surface: '#FFFFFF',
        ink: '#241A12',
        muted: '#8B7461',
        accent: '#B4451F',
        accentInk: '#FFFFFF',
      },
      display: SERIF,
      body: GROTESK,
      archetype: 'catalog',
    },
  },
  {
    slug: 'estate',
    business: 'Estate agency',
    category: 'real-estate',
    headline: 'Homes worth the move',
    tagline: 'Boutique sales and lettings',
    nav: ['For sale', 'To let', 'Areas'],
    cta: 'Free valuation',
    sections: ['Property listings', 'Area guides', 'Free valuation', 'Agent profiles'],
    showcase: [
      { label: '3 BHK, Koregaon Park', meta: '₹2.4 Cr' },
      { label: '2 BHK, Baner Hills', meta: '₹1.15 Cr' },
      { label: 'Row house, Aundh', meta: '₹3.6 Cr' },
      { label: 'Studio, Viman Nagar', meta: '₹62 L' },
    ],
    direction: {
      name: 'Confident navy',
      mood: 'Established, trustworthy, print-catalogue feel',
      palette: {
        bg: '#0F1B2A',
        surface: '#16253A',
        ink: '#F3F6FA',
        muted: '#8FA3BC',
        accent: '#C9A227',
        accentInk: '#0F1B2A',
      },
      display: SERIF,
      body: GROTESK,
      archetype: 'directory',
    },
  },
  {
    slug: 'plumber',
    business: 'Plumber / electrician',
    category: 'local-services',
    headline: 'Leaking now? Call now.',
    tagline: '24-hour callout across the city',
    nav: ['Services', 'Areas', 'Prices'],
    cta: 'Call 24/7',
    sections: ['Services and prices', 'Areas covered', 'Emergency number up top', 'Quote request'],
    direction: {
      name: 'Utility bold',
      mood: 'Phone number first, decoration last',
      palette: {
        bg: '#FFFFFF',
        surface: '#F1F4F7',
        ink: '#111820',
        muted: '#5C6A78',
        accent: '#0B62D6',
        accentInk: '#FFFFFF',
      },
      display: GROTESK,
      body: GROTESK,
      archetype: 'split',
    },
  },
  {
    slug: 'designer',
    business: 'Independent designer',
    category: 'portfolio',
    headline: 'Selected work, 2019—now',
    tagline: 'Brand and interface design',
    nav: ['Work', 'About', 'Process'],
    cta: 'Contact',
    sections: ['Case studies', 'About and process', 'Availability', 'Contact'],
    direction: {
      name: 'Swiss archive',
      mood: 'Strict grid, generous white, no ornament',
      palette: {
        bg: '#FFFFFF',
        surface: '#F4F4F2',
        ink: '#0A0A0A',
        muted: '#6E6E6E',
        accent: '#1B4DFF',
        accentInk: '#FFFFFF',
      },
      display: GROTESK,
      body: MONO,
      archetype: 'editorial',
    },
  },
  {
    slug: 'saas',
    business: 'Small SaaS tool',
    category: 'saas',
    headline: 'Invoices that chase themselves',
    tagline: 'For freelancers who hate admin',
    nav: ['Features', 'Pricing', 'Docs'],
    cta: 'Start free',
    sections: ['What it does', 'Pricing tiers', 'Screenshots', 'Start free'],
    direction: {
      name: 'Product dark',
      mood: 'Technical, crisp, one bright accent',
      palette: {
        bg: '#0B0D12',
        surface: '#151922',
        ink: '#EEF1F6',
        muted: '#7C869B',
        accent: '#6C8CFF',
        accentInk: '#0B0D12',
      },
      display: GROTESK,
      body: GROTESK,
      archetype: 'grid',
    },
  },
  {
    slug: 'yoga',
    business: 'Yoga studio',
    category: 'gym',
    headline: 'Breathe, then move',
    tagline: 'Small classes in a quiet room',
    nav: ['Schedule', 'Teachers', 'Passes'],
    cta: 'First class free',
    sections: ['Class schedule', 'Teachers', 'Drop-in and passes', 'First class free'],
    direction: {
      name: 'Earth and paper',
      mood: 'Slow, natural, plenty of air',
      palette: {
        bg: '#F3F0E7',
        surface: '#FFFFFF',
        ink: '#33362C',
        muted: '#7C8070',
        accent: '#6B7F5B',
        accentInk: '#FFFFFF',
      },
      display: SERIF,
      body: HUMANIST,
      archetype: 'poster',
    },
  },
  {
    slug: 'bakery',
    business: 'Bakery',
    category: 'restaurant',
    headline: 'Out of the oven at seven',
    tagline: 'Sourdough, pastry and a small counter',
    nav: ['Today', 'Cakes', 'Find us'],
    cta: 'Order',
    sections: ['Todays bakes', 'Order a cake', 'Where to find us', 'Wholesale enquiries'],
    showcase: [
      { label: 'Country sourdough', meta: '₹260' },
      { label: 'Almond croissant', meta: '₹180' },
      { label: 'Cardamom bun', meta: '₹150' },
      { label: 'Celebration cake', meta: 'from ₹1,400' },
    ],
    direction: {
      name: 'Handmade counter',
      mood: 'Cheerful, hand-lettered, neighbourhood',
      palette: {
        bg: '#FFF6E8',
        surface: '#FFFFFF',
        ink: '#3A2416',
        muted: '#9A7A5C',
        accent: '#E0653C',
        accentInk: '#FFFFFF',
      },
      display: SERIF,
      body: HUMANIST,
      archetype: 'directory',
    },
  },
];

/**
 * The prompt "Use this idea" sends to the generator. The design direction is
 * spelled out in full — exact hex values and font intent — because the model
 * only builds what the prompt actually asks for.
 */
export function promptFor(idea: Idea): string {
  const { direction } = idea;
  const fonts = direction.display === direction.body ? 'one grotesk throughout' : 'a serif display paired with a clean sans for body copy';

  return [
    `${idea.business}. ${idea.tagline}.`,
    `Include: ${idea.sections.join('; ')}.`,
    `Design direction — ${direction.name}: ${direction.mood}.`,
    `Palette: background ${direction.palette.bg}, panels ${direction.palette.surface}, text ${direction.palette.ink}, secondary text ${direction.palette.muted}, a single accent ${direction.palette.accent}.`,
    `Typography: ${fonts}.`,
    `Layout: ${LAYOUT_BRIEF[direction.archetype]}`,
  ].join(' ');
}

const LAYOUT_BRIEF: Record<Archetype, string> = {
  editorial:
    'a tall editorial hero with an oversized headline, then asymmetric two-column sections and a full-width pull quote.',
  grid: 'a centred hero, then a three-card feature grid and a band of numbers.',
  split: 'a fifty-fifty hero with imagery on one side, then alternating image-and-text rows.',
  poster: 'a full-bleed poster hero with very large centred type, one call to action, and a strip of four short items below.',
  catalog: 'a compact hero, then a four-up product grid with prices, repeated down the page.',
  directory: 'a slim hero, then a vertical list of rows each with a thumbnail, a title and a detail line.',
};

export function ideaBySlug(slug: string): Idea | undefined {
  return IDEAS.find((idea) => idea.slug === slug);
}

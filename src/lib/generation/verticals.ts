import type { SectionKind } from './kit/sections';

/**
 * What a website for this kind of business is actually made of.
 *
 * A salon needs a price list and a booking line; a clinic needs treatments and
 * insurance; a coaching centre needs results and batch timings. Asking a model
 * to work that out from one sentence produces the same four generic sections
 * every time, so the shape is decided here and the model fills it in.
 *
 * Written for Indian small businesses, which is who this is for.
 */

export interface VerticalPage {
  path: string;
  title: string;
  sections: SectionKind[];
}

export interface Vertical {
  slug: string;
  label: string;
  /** Words in a prompt that mean this vertical. */
  match: string[];
  tone: string;
  /** What the owner wants a visitor to do. */
  action: string;
  pages: VerticalPage[];
}

const CONTACT_PAGE: VerticalPage = {
  path: 'contact.html',
  title: 'Contact',
  sections: ['hero', 'contact', 'hours', 'cta'],
};

export const VERTICALS: Vertical[] = [
  {
    slug: 'salon',
    label: 'Salon & spa',
    match: ['salon', 'spa', 'parlour', 'parlor', 'hair', 'beauty', 'nails', 'barber', 'makeup'],
    tone: 'Calm, tactile, quietly expensive',
    action: 'Book an appointment',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'gallery', 'testimonials', 'cta'] },
      { path: 'services.html', title: 'Services & prices', sections: ['hero', 'services', 'faq', 'cta'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'stats'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'restaurant',
    label: 'Restaurant & café',
    match: ['restaurant', 'cafe', 'café', 'bistro', 'diner', 'kitchen', 'bakery', 'food', 'dhaba', 'eatery'],
    tone: 'Warm, appetising, unhurried',
    action: 'Book a table',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'about', 'gallery', 'testimonials', 'cta'] },
      { path: 'menu.html', title: 'Menu', sections: ['hero', 'menu', 'faq'] },
      { path: 'about.html', title: 'Our story', sections: ['hero', 'about', 'team', 'stats'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'clinic',
    label: 'Clinic & healthcare',
    match: ['clinic', 'dental', 'dentist', 'doctor', 'hospital', 'physio', 'health', 'medical', 'ayurved', 'diagnostic'],
    tone: 'Calm, plain-spoken, reassuring. No jargon',
    action: 'Book a consultation',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'steps', 'testimonials', 'cta'] },
      { path: 'treatments.html', title: 'Treatments', sections: ['hero', 'services', 'faq', 'cta'] },
      { path: 'about.html', title: 'About us', sections: ['hero', 'about', 'team', 'stats'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'gym',
    label: 'Gym & fitness',
    match: ['gym', 'fitness', 'crossfit', 'yoga', 'pilates', 'zumba', 'training', 'workout', 'strength'],
    tone: 'Loud, confident, built to be read on a phone',
    action: 'Start a free trial',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'stats', 'features', 'testimonials', 'cta'] },
      { path: 'timetable.html', title: 'Classes', sections: ['hero', 'services', 'faq', 'cta'] },
      { path: 'pricing.html', title: 'Membership', sections: ['hero', 'pricing', 'faq'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'coaching',
    label: 'Coaching & tuition',
    match: ['coaching', 'tuition', 'tutor', 'institute', 'academy', 'classes', 'jee', 'neet', 'upsc', 'school', 'learning'],
    tone: 'Serious, results-first, trusted by parents',
    action: 'Book a demo class',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'stats', 'features', 'testimonials', 'cta'] },
      { path: 'courses.html', title: 'Courses & batches', sections: ['hero', 'services', 'steps', 'faq'] },
      { path: 'results.html', title: 'Results', sections: ['hero', 'stats', 'testimonials', 'team'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'real-estate',
    label: 'Real estate',
    match: ['real estate', 'property', 'realtor', 'builder', 'flats', 'apartments', 'broker', 'housing', 'plots'],
    tone: 'Established and trustworthy, print-catalogue feel',
    action: 'Request a site visit',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'stats', 'testimonials', 'cta'] },
      { path: 'properties.html', title: 'Properties', sections: ['hero', 'services', 'gallery', 'cta'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'steps'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'retail',
    label: 'Boutique & retail',
    match: ['boutique', 'shop', 'store', 'retail', 'handmade', 'jewellery', 'jewelry', 'clothing', 'saree', 'craft', 'ecommerce'],
    tone: 'Considered, product-first, generous photography',
    action: 'Shop the collection',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'gallery', 'features', 'testimonials', 'cta'] },
      { path: 'shop.html', title: 'Shop', sections: ['hero', 'services', 'faq', 'cta'] },
      { path: 'about.html', title: 'Our story', sections: ['hero', 'about', 'steps', 'stats'] },
      CONTACT_PAGE,
    ],
  },
];

/** The shape used when nothing matches: a competent general business site. */
export const DEFAULT_VERTICAL: Vertical = {
  slug: 'general',
  label: 'General business',
  match: [],
  tone: 'Clear, credible, easy to scan',
  action: 'Get in touch',
  pages: [
    { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'about', 'testimonials', 'cta'] },
    { path: 'services.html', title: 'Services', sections: ['hero', 'services', 'steps', 'faq'] },
    { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'stats'] },
    CONTACT_PAGE,
  ],
};

/**
 * Picks the vertical from whatever the owner wrote.
 *
 * Scored rather than first-match: "gym and juice cafe" should land on the gym
 * if the gym words are stronger, not on whichever appears in the list first.
 */
export function matchVertical(text: string): Vertical {
  const haystack = ` ${text.toLowerCase().replace(/[^a-zÀ-ɏ\s]/g, ' ')} `;
  let best: { vertical: Vertical; score: number } | null = null;

  for (const vertical of VERTICALS) {
    let score = 0;
    for (const word of vertical.match) {
      if (haystack.includes(` ${word} `)) score += 2;
      else if (haystack.includes(word)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { vertical, score };
  }

  return best?.vertical ?? DEFAULT_VERTICAL;
}

export const verticalBySlug = (slug: string): Vertical | undefined =>
  VERTICALS.find((vertical) => vertical.slug === slug);

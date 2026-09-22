import type { SectionKind } from './kit/sections';
import type { ShopSlot } from '@/lib/shop/inject';

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
  /**
   * Where the shop renders into this page.
   *
   * The file is written with an empty marker in it; the grid, the basket and
   * the checkout are filled in from the database when the page is served, so a
   * price change is live immediately rather than at the next rebuild.
   */
  shopSlot?: ShopSlot;
  /** Written as a file, but not a nav entry. A basket is not a page to browse. */
  hidden?: boolean;
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
  /**
   * This business sells things, so the site is built with a real shop in it:
   * products, categories, a basket, a checkout and somewhere the orders land.
   */
  shop?: boolean;
}

/**
 * The three pages a shop adds.
 *
 * Shop carries a hero the model writes, because a shop front needs a sentence
 * saying what is sold here. The basket and the checkout carry only their own
 * heading — there is nothing to say on them that the page is not already
 * showing, and a paragraph of marketing copy above a checkout form is how
 * carts get abandoned.
 */
export const SHOP_PAGES: VerticalPage[] = [
  { path: 'shop.html', title: 'Shop', sections: ['hero'], shopSlot: 'shop' },
  { path: 'cart.html', title: 'Your basket', sections: [], shopSlot: 'cart', hidden: true },
  { path: 'checkout.html', title: 'Checkout', sections: [], shopSlot: 'checkout', hidden: true },
];

const CONTACT_PAGE: VerticalPage = {
  path: 'contact.html',
  title: 'Contact',
  sections: ['hero', 'contact', 'hours', 'faq', 'cta'],
};

export const VERTICALS: Vertical[] = [
  {
    slug: 'salon',
    label: 'Salon & spa',
    match: ['salon', 'spa', 'parlour', 'parlor', 'hair', 'beauty', 'nails', 'barber', 'makeup'],
    tone: 'Calm, tactile, quietly expensive',
    action: 'Book an appointment',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'services', 'gallery', 'stats', 'testimonials', 'cta'] },
      { path: 'services.html', title: 'Services & prices', sections: ['hero', 'services', 'pricing', 'steps', 'faq', 'cta'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'stats', 'gallery'] },
      { path: 'gallery.html', title: 'Gallery', sections: ['hero', 'gallery', 'testimonials', 'cta'] },
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
      { path: 'index.html', title: 'Home', sections: ['hero', 'about', 'menu', 'gallery', 'hours', 'testimonials', 'cta'] },
      { path: 'menu.html', title: 'Menu', sections: ['hero', 'menu', 'pricing', 'faq', 'cta'] },
      { path: 'about.html', title: 'Our story', sections: ['hero', 'about', 'team', 'stats', 'gallery'] },
      { path: 'gallery.html', title: 'Gallery', sections: ['hero', 'gallery', 'testimonials', 'cta'] },
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
      { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'services', 'steps', 'stats', 'testimonials', 'cta'] },
      { path: 'treatments.html', title: 'Treatments', sections: ['hero', 'services', 'pricing', 'steps', 'faq', 'cta'] },
      { path: 'about.html', title: 'About us', sections: ['hero', 'about', 'team', 'stats', 'gallery'] },
      { path: 'faq.html', title: 'Questions', sections: ['hero', 'faq', 'hours', 'cta'] },
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
      { path: 'index.html', title: 'Home', sections: ['hero', 'stats', 'features', 'services', 'gallery', 'testimonials', 'cta'] },
      { path: 'timetable.html', title: 'Classes', sections: ['hero', 'services', 'steps', 'hours', 'faq', 'cta'] },
      { path: 'pricing.html', title: 'Membership', sections: ['hero', 'pricing', 'features', 'faq', 'cta'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'stats'] },
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
      { path: 'index.html', title: 'Home', sections: ['hero', 'stats', 'features', 'services', 'steps', 'testimonials', 'cta'] },
      { path: 'courses.html', title: 'Courses & batches', sections: ['hero', 'services', 'pricing', 'steps', 'hours', 'faq'] },
      { path: 'results.html', title: 'Results', sections: ['hero', 'stats', 'testimonials', 'team', 'cta'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'gallery'] },
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
      { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'services', 'stats', 'gallery', 'testimonials', 'cta'] },
      { path: 'properties.html', title: 'Properties', sections: ['hero', 'services', 'gallery', 'pricing', 'faq', 'cta'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'steps', 'stats'] },
      { path: 'process.html', title: 'How it works', sections: ['hero', 'steps', 'faq', 'cta'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'retail',
    label: 'Boutique & retail',
    match: [
      'boutique', 'shop', 'store', 'retail', 'handmade', 'jewellery', 'jewelry', 'clothing',
      'saree', 'craft', 'ecommerce', 'e-commerce', 'online store', 'products', 'selling',
      'cart', 'checkout', 'd2c', 'merchandise', 'kirana', 'grocery',
    ],
    tone: 'Considered, product-first, generous photography',
    action: 'Buy something',
    shop: true,
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'gallery', 'stats', 'testimonials', 'cta'] },
      ...SHOP_PAGES,
      { path: 'about.html', title: 'Our story', sections: ['hero', 'about', 'steps', 'stats', 'gallery'] },
      { path: 'faq.html', title: 'Delivery & returns', sections: ['hero', 'faq', 'cta'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'photography',
    label: 'Photography & events',
    match: ['photograph', 'photographer', 'photography', 'wedding', 'event', 'videograph', 'studio', 'shoot', 'portrait', 'decor'],
    tone: 'Let the work speak. Almost no chrome, enormous pictures',
    action: 'Check a date',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'gallery', 'about', 'services', 'testimonials', 'cta'] },
      { path: 'work.html', title: 'Work', sections: ['hero', 'gallery', 'testimonials', 'cta'] },
      { path: 'pricing.html', title: 'Packages', sections: ['hero', 'pricing', 'steps', 'faq', 'cta'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'stats', 'team'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'interiors',
    label: 'Interiors & architecture',
    match: ['interior', 'architect', 'design studio', 'furniture', 'modular', 'kitchen design', 'renovation', 'carpentry'],
    tone: 'Composed and material. Space, texture and restraint',
    action: 'Book a consultation',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'about', 'gallery', 'services', 'stats', 'testimonials', 'cta'] },
      { path: 'projects.html', title: 'Projects', sections: ['hero', 'gallery', 'testimonials', 'cta'] },
      { path: 'services.html', title: 'What we do', sections: ['hero', 'services', 'steps', 'pricing', 'faq'] },
      { path: 'about.html', title: 'Studio', sections: ['hero', 'about', 'team', 'stats'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'legal',
    label: 'Legal & professional',
    match: ['lawyer', 'legal', 'advocate', 'solicitor', 'chartered accountant', 'accountant', 'audit', 'tax', 'consultant', 'company secretary', 'compliance'],
    tone: 'Sober, precise and reassuring. Nothing flashy, nothing vague',
    action: 'Request a consultation',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'services', 'about', 'stats', 'testimonials', 'cta'] },
      { path: 'practice.html', title: 'Practice areas', sections: ['hero', 'services', 'steps', 'faq', 'cta'] },
      { path: 'team.html', title: 'People', sections: ['hero', 'team', 'stats', 'about'] },
      { path: 'faq.html', title: 'Questions', sections: ['hero', 'faq', 'hours', 'cta'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'finance',
    label: 'Finance & insurance',
    match: ['finance', 'insurance', 'loan', 'mutual fund', 'investment', 'wealth', 'broker', 'mortgage', 'lending', 'advisor'],
    tone: 'Trustworthy and plain. Numbers stated, never dressed up',
    action: 'Get a quote',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'services', 'stats', 'steps', 'testimonials', 'cta'] },
      { path: 'products.html', title: 'What we offer', sections: ['hero', 'services', 'pricing', 'faq', 'cta'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'stats'] },
      { path: 'faq.html', title: 'Questions', sections: ['hero', 'faq', 'cta'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'automotive',
    label: 'Automotive & workshop',
    match: ['garage', 'automotive', 'car', 'bike', 'motor', 'workshop', 'service centre', 'service center', 'mechanic', 'denting', 'painting', 'tyre', 'detailing'],
    tone: 'Practical and confident. Built to be read in a hurry',
    action: 'Book a service',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'services', 'features', 'stats', 'testimonials', 'cta'] },
      { path: 'services.html', title: 'Services & rates', sections: ['hero', 'services', 'pricing', 'steps', 'faq'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'gallery'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'travel',
    label: 'Travel & hospitality',
    match: ['travel', 'tour', 'hotel', 'resort', 'homestay', 'lodge', 'guest house', 'trek', 'holiday', 'package', 'itinerary', 'booking'],
    tone: 'Inviting and photographic. Somewhere you want to be',
    action: 'Check availability',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'gallery', 'services', 'features', 'testimonials', 'cta'] },
      { path: 'stays.html', title: 'Stays & tours', sections: ['hero', 'services', 'pricing', 'gallery', 'faq'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'stats', 'team'] },
      { path: 'gallery.html', title: 'Gallery', sections: ['hero', 'gallery', 'testimonials', 'cta'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'agriculture',
    label: 'Agriculture & produce',
    match: ['farm', 'agri', 'agriculture', 'organic', 'produce', 'dairy', 'nursery', 'seeds', 'fertiliser', 'fertilizer', 'krishi', 'mandi', 'harvest'],
    tone: 'Grounded and seasonal. Real fields, real people',
    action: 'Place an order',
    shop: true,
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'about', 'stats', 'testimonials', 'cta'] },
      ...SHOP_PAGES,
      { path: 'about.html', title: 'Our farm', sections: ['hero', 'about', 'steps', 'gallery'] },
      { path: 'faq.html', title: 'Delivery', sections: ['hero', 'faq', 'cta'] },
      CONTACT_PAGE,
    ],
  },
  {
    slug: 'agency',
    label: 'Agency & software',
    match: ['agency', 'software', 'saas', 'startup', 'app', 'development', 'marketing agency', 'digital', 'branding', 'it company', 'technology', 'ai'],
    tone: 'Sharp and technical. Confident without shouting',
    action: 'Book a call',
    pages: [
      { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'services', 'stats', 'testimonials', 'cta'] },
      { path: 'work.html', title: 'Work', sections: ['hero', 'gallery', 'stats', 'testimonials', 'cta'] },
      { path: 'services.html', title: 'Services', sections: ['hero', 'services', 'steps', 'pricing', 'faq'] },
      { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'stats'] },
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
    { path: 'index.html', title: 'Home', sections: ['hero', 'features', 'services', 'about', 'stats', 'testimonials', 'cta'] },
    { path: 'services.html', title: 'Services', sections: ['hero', 'services', 'pricing', 'steps', 'faq', 'cta'] },
    { path: 'about.html', title: 'About', sections: ['hero', 'about', 'team', 'stats', 'gallery'] },
    { path: 'gallery.html', title: 'Gallery', sections: ['hero', 'gallery', 'testimonials', 'cta'] },
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

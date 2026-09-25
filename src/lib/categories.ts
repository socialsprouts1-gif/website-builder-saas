export interface Category {
  slug: string;
  label: string;
  seedPrompt: string;
}

/** The quick-start chips from the hero, reused for onboarding and template filters. */
export const CATEGORIES: Category[] = [
  {
    slug: 'restaurant',
    label: 'Restaurant',
    seedPrompt: 'A candlelit neighbourhood bistro with a seasonal menu and online reservations',
  },
  {
    slug: 'portfolio',
    label: 'Portfolio',
    seedPrompt: 'A minimal portfolio for an independent designer, with case studies and a contact form',
  },
  {
    slug: 'gym',
    label: 'Gym',
    seedPrompt: 'A strength-and-conditioning gym with class timetables, coach bios and a free-trial signup',
  },
  {
    slug: 'dentist',
    label: 'Dentist',
    seedPrompt: 'A calm family dental clinic with treatment pages, insurance info and appointment booking',
  },
  {
    slug: 'ecommerce',
    label: 'Ecommerce',
    seedPrompt: 'A small-batch coffee roaster storefront with product pages and a checkout',
  },
  {
    slug: 'real-estate',
    label: 'Real estate',
    seedPrompt: 'A boutique real-estate agency with property listings, agent profiles and a valuation enquiry form',
  },
  {
    slug: 'salon',
    label: 'Salon',
    seedPrompt: 'A modern hair salon with a services price list, stylist profiles and online booking',
  },
  {
    slug: 'photographer',
    label: 'Photographer',
    seedPrompt: 'A wedding photographer portfolio with galleries, packages and an enquiry form',
  },
  {
    slug: 'local-services',
    label: 'Local services',
    seedPrompt: 'A local plumbing company with service areas, emergency callout info and a quote request form',
  },
  {
    slug: 'saas',
    label: 'SaaS landing',
    seedPrompt: 'A landing page for a small SaaS tool with features, pricing tiers and a signup CTA',
  },
  {
    slug: 'clinic',
    label: 'Clinic',
    seedPrompt:
      'A multi-speciality clinic with departments, consultant profiles, timings and appointment booking',
  },
  {
    slug: 'cafe',
    label: 'Café',
    seedPrompt: 'A neighbourhood café and bakery with a daily menu, opening hours and pre-orders',
  },
  {
    slug: 'hotel',
    label: 'Hotel',
    seedPrompt: 'A boutique hotel with rooms, rates, facilities, dining and an availability enquiry',
  },
  {
    slug: 'travel',
    label: 'Travel',
    seedPrompt: 'A travel agency with tour packages, destinations, departure dates and what is included',
  },
  {
    slug: 'coaching',
    label: 'Coaching',
    seedPrompt: 'A coaching centre with courses, batch timings, faculty, results and fees',
  },
  {
    slug: 'school',
    label: 'School',
    seedPrompt: 'A school with admissions, curriculum, facilities and campus life',
  },
  {
    slug: 'construction',
    label: 'Builder',
    seedPrompt: 'A building contractor with completed projects, services, licences and a quote request',
  },
  {
    slug: 'interiors',
    label: 'Interiors',
    seedPrompt: 'An interior design studio with project case studies, the process and a starting-price guide',
  },
  {
    slug: 'automotive',
    label: 'Automotive',
    seedPrompt: 'A car dealership with stock, prices, finance options and test-drive booking',
  },
  {
    slug: 'trades',
    label: 'Plumber',
    seedPrompt: 'A plumbing and electrical business with emergency callout, areas covered and a quote form',
  },
  {
    slug: 'legal',
    label: 'Law firm',
    seedPrompt: 'A law firm with practice areas, the lawyers, and a consultation request',
  },
  {
    slug: 'finance',
    label: 'Accountant',
    seedPrompt: 'A chartered accountant with services, fees, key filing dates and a consultation booking',
  },
  {
    slug: 'agency',
    label: 'Agency',
    seedPrompt: 'A digital marketing agency with results, services, clients and a proposal request',
  },
  {
    slug: 'events',
    label: 'Weddings',
    seedPrompt: 'A wedding planner with real weddings, services, packages and a date check',
  },
  {
    slug: 'jewellery',
    label: 'Jewellery',
    seedPrompt: 'A jewellery boutique with a collection, the craft behind it, prices and online ordering',
  },
  {
    slug: 'fashion',
    label: 'Clothing',
    seedPrompt:
      'A clothing label with a product catalogue, sizes, prices, a basket and checkout, and delivery information',
  },
  {
    slug: 'nonprofit',
    label: 'NGO',
    seedPrompt: 'A nonprofit with the work it does, who it reaches, how it is funded and how to donate',
  },
];

/**
 * The chips under the hero.
 *
 * Six of twenty-seven was a fraction of what Lumen can build, and the six it
 * showed were the only ones most people ever discovered. The full list is here
 * and the hero shows more of it; `/templates` remains where somebody goes to
 * see what each one actually looks like.
 */
export const HERO_CATEGORIES = CATEGORIES;

export function categoryBySlug(slug: string | null | undefined): Category | undefined {
  if (!slug) return undefined;
  return CATEGORIES.find((category) => category.slug === slug);
}

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
];

/** The six shown in the hero; the rest surface in /templates. */
export const HERO_CATEGORIES = CATEGORIES.slice(0, 6);

export function categoryBySlug(slug: string | null | undefined): Category | undefined {
  if (!slug) return undefined;
  return CATEGORIES.find((category) => category.slug === slug);
}

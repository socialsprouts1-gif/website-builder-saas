/**
 * The industry groups the library is filed under.
 *
 * Deliberately broader than the blueprints themselves: somebody looking for a
 * site for their bakery does not think "restaurant vertical", they think food.
 * `match` is what a typed prompt is matched against when Lumen recommends
 * templates rather than guessing a structure.
 */
export interface TemplateIndustry {
  slug: string;
  label: string;
  /** The businesses inside it, for the card and for search. */
  examples: string[];
  /**
   * The words that mean this industry and little else. "dental", "gym".
   */
  match: string[];
  /**
   * Words that point here but are shared with other trades — "classes",
   * "studio", "shop". A strong match anywhere always beats a weak one, because
   * "gym with classes" is a gym, and without the distinction the longest word
   * won and it became a coaching centre.
   */
  weak?: string[];
}

export const TEMPLATE_INDUSTRIES: TemplateIndustry[] = [
  {
    slug: 'food',
    label: 'Restaurants & cafés',
    examples: ['Restaurant', 'Café', 'Bakery', 'Cloud kitchen', 'Bar'],
    match: ['restaurant', 'cafe', 'café', 'bistro', 'dhaba', 'bakery', 'kitchen', 'diner', 'food', 'pizzeria', 'eatery', 'catering', 'bar', 'pub'],
  },
  {
    slug: 'health',
    label: 'Clinics & healthcare',
    examples: ['Dental clinic', 'Doctor', 'Physiotherapy', 'Diagnostics', 'Eye care'],
    match: ['clinic', 'dental', 'dentist', 'doctor', 'hospital', 'physio', 'medical', 'health', 'ayurved', 'diagnostic', 'orthodont', 'dermat', 'ivf', 'eye', 'ent'],
  },
  {
    slug: 'property',
    label: 'Real estate & construction',
    examples: ['Estate agency', 'Builder', 'Architect', 'Interior designer', 'Property developer'],
    match: ['real estate', 'property', 'realty', 'builder', 'construction', 'architect', 'interior', 'flats', 'apartment', 'plots', 'developer', 'contractor'],
  },
  {
    slug: 'fitness',
    label: 'Gyms & fitness',
    examples: ['Gym', 'Yoga studio', 'CrossFit box', 'Personal trainer', 'Dance studio'],
    match: ['gym', 'fitness', 'crossfit', 'yoga', 'pilates', 'zumba', 'workout', 'strength', 'trainer', 'dance', 'martial', 'karate'],
  },
  {
    slug: 'beauty',
    label: 'Salons & beauty',
    examples: ['Hair salon', 'Spa', 'Nail bar', 'Barber', 'Makeup artist'],
    match: ['salon', 'spa', 'parlour', 'parlor', 'hair', 'beauty', 'nails', 'barber', 'makeup', 'skin', 'wellness'],
  },
  {
    slug: 'hospitality',
    label: 'Hotels & travel',
    examples: ['Hotel', 'Resort', 'Homestay', 'Travel agency', 'Tour operator'],
    match: ['hotel', 'resort', 'homestay', 'villa', 'lodge', 'travel', 'tour', 'trek', 'safari', 'hostel'],
    weak: ['holiday', 'package'],
  },
  {
    slug: 'education',
    label: 'Education & coaching',
    examples: ['Coaching centre', 'School', 'Computer classes', 'Music school', 'Tutor'],
    match: ['coaching', 'tuition', 'institute', 'academy', 'school', 'college', 'education', 'computer class'],
    weak: ['classes', 'training', 'course', 'learn', 'tutor'],
  },
  {
    slug: 'retail',
    label: 'Shops & e-commerce',
    examples: ['Online store', 'Boutique', 'Jewellery', 'Grocery', 'Electronics'],
    match: ['ecommerce', 'e-commerce', 'boutique', 'jewel', 'clothing', 'fashion', 'grocery', 'kirana', 'electronics', 'marketplace'],
    weak: ['shop', 'store', 'retail'],
  },
  {
    slug: 'creative',
    label: 'Photography & portfolio',
    examples: ['Photographer', 'Designer', 'Illustrator', 'Videographer', 'Artist'],
    match: ['photograph', 'photo', 'portfolio', 'designer', 'illustrat', 'video', 'film', 'artist'],
    weak: ['design studio', 'creative'],
  },
  {
    slug: 'professional',
    label: 'Legal & finance',
    examples: ['Law firm', 'Chartered accountant', 'Consultant', 'Insurance advisor', 'Wealth manager'],
    match: ['law', 'lawyer', 'advocate', 'legal', 'chartered accountant', 'accountant', 'tax', 'finance', 'audit', 'insurance', 'wealth', 'gst'],
    weak: ['consult'],
  },
  {
    slug: 'software',
    label: 'SaaS & technology',
    examples: ['SaaS product', 'Mobile app', 'IT services', 'AI product', 'Startup'],
    match: ['saas', 'software', 'startup', 'ai', 'api', 'dashboard', 'crm', 'erp', 'it services'],
    weak: ['app', 'platform', 'tech'],
  },
  {
    slug: 'agency',
    label: 'Agencies & studios',
    examples: ['Digital marketing', 'Branding studio', 'Web agency', 'PR firm', 'Production house'],
    match: ['agency', 'marketing', 'branding', 'seo', 'advertis', 'social media', 'pr firm'],
    weak: ['studio', 'digital', 'production'],
  },
  {
    slug: 'automotive',
    label: 'Automotive',
    examples: ['Car dealership', 'Service centre', 'Car wash', 'Driving school', 'Bike showroom'],
    match: ['car', 'auto', 'vehicle', 'garage', 'showroom', 'dealership', 'service centre', 'service center', 'bike', 'motor', 'tyre', 'driving school'],
  },
  {
    slug: 'events',
    label: 'Events & weddings',
    examples: ['Wedding planner', 'Event management', 'Banquet hall', 'Caterer', 'Decorator'],
    match: ['wedding', 'event', 'banquet', 'decor', 'planner', 'mandap', 'caterer', 'celebration', 'party'],
  },
  {
    slug: 'trades',
    label: 'Local services & trades',
    examples: ['Plumber', 'Electrician', 'Pest control', 'Movers', 'Repairs'],
    match: ['plumber', 'electrician', 'carpenter', 'pest', 'movers', 'packers', 'ac service', 'handyman', 'logistics'],
    weak: ['repair', 'cleaning'],
  },
  {
    slug: 'community',
    label: 'Nonprofits & personal',
    examples: ['NGO', 'Trust', 'Personal brand', 'Speaker', 'Community group'],
    match: ['ngo', 'nonprofit', 'non-profit', 'trust', 'foundation', 'charity', 'personal brand', 'speaker', 'author'],
    weak: ['coach', 'community'],
  },
];

export const industryBySlug = (slug: string): TemplateIndustry | undefined =>
  TEMPLATE_INDUSTRIES.find((industry) => industry.slug === slug);

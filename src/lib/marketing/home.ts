import {
  CREDIT_COST,
  DAILY_PLATFORM_CREDITS,
  PLAN_PRICE_LABEL,
  PRO_DAILY_PLATFORM_CREDITS,
  WELCOME_CREDITS,
} from '@/lib/env';

/**
 * What the home page says, as data.
 *
 * Here rather than inline in the page for one reason: a landing page is where
 * a product is most tempted to describe itself generously, and a claim in a
 * literal buried in 600 lines of markup is a claim nobody re-reads when the
 * feature it describes changes. As data it can be checked — see home.test.ts,
 * which refuses anything on this page that Lumen cannot actually do.
 */

export interface Step {
  number: string;
  title: string;
  body: string;
}

export const STEPS: Step[] = [
  {
    number: '01',
    title: 'Describe',
    body: 'One sentence about the business. Type it, paste a screenshot of a site you like, or hold the mic and say it — all three arrive at the same place.',
  },
  {
    number: '02',
    title: 'Generate',
    body: 'Lumen writes the brief, picks a template and a palette, and builds every page — real copy, real prices, real sections. You watch it happen.',
  },
  {
    number: '03',
    title: 'Customise and publish',
    body: 'Change anything in chat or by clicking it on the page. Then publish — to a lumensite.in address, or to a domain you own.',
  },
];

export interface BuildKind {
  title: string;
  body: string;
  /** The per-trade page this card belongs to, so the cards are real links. */
  href: string;
}

export const BUILDS: BuildKind[] = [
  {
    title: 'Business websites',
    body: 'The site a shop, clinic or agency is judged by. Services, team, hours, and a form that reaches your phone.',
    href: '/for/dental-clinic-website',
  },
  {
    title: 'Online stores',
    body: 'Products, a basket, a checkout priced on the server, and orders that arrive on WhatsApp. Photography generated for every product.',
    href: '/for/online-store',
  },
  {
    title: 'Landing pages',
    body: 'One page, one action. Built around the thing you want somebody to do, with the call to action kept in view.',
    href: '/for/saas-landing-page',
  },
  {
    title: 'Portfolios',
    body: 'Work first, chrome last. A design direction chosen up front so it reads as considered rather than templated.',
    href: '/for/portfolio-website',
  },
  {
    title: 'SaaS websites',
    body: 'The problem, the features, the pricing tiers and the signup — written from what the product actually does.',
    href: '/for/saas-landing-page',
  },
  {
    title: 'Local services',
    body: 'A tappable number at the top, the areas you cover by name, and a quote request that does not wait for Monday.',
    href: '/for/plumber-website',
  },
];

export interface Capability {
  title: string;
  body: string;
}

export const CAPABILITIES: Capability[] = [
  { title: 'Website generation', body: 'A brief, a plan, then every page — not one page and a promise.' },
  { title: 'A design system', body: 'Palette, type pairing, spacing and radius, generated per project and checked for contrast.' },
  { title: 'Copywriting', body: 'Menu items, prices, staff bios, service descriptions. Never lorem ipsum.' },
  { title: 'Sections that fit', body: 'A gym gets a timetable, a bistro gets a menu. Lumen decides which sections the business needs.' },
  { title: 'Responsive layouts', body: 'Built for a phone first, because that is what your customers are holding.' },
  { title: 'Image generation', body: 'Photographs for the page and for every product, or upload your own and Lumen lays them out.' },
  { title: 'Visual editing', body: 'Click any element on the page and change it. No rebuild, no lost work.' },
  { title: 'Real code', body: 'HTML, CSS and JavaScript you can read, export as a zip, or push to your own GitHub.' },
  { title: 'Custom domains', body: 'Point a domain you own at the site, with the DNS records spelled out for you.' },
  { title: 'One-click publishing', body: 'Publish, and it is live. Publish again and only what changed is replaced.' },
];

export interface Comparison {
  before: string;
  after: string;
}

export const COMPARISON: Comparison[] = [
  { before: 'Start from a blank page', after: 'Start from a sentence' },
  { before: 'Hours of design decisions', after: 'A design system in under a minute' },
  { before: 'Needs someone who can code', after: 'Needs a description of your business' },
  { before: 'Build every section by hand', after: 'Lumen picks the sections the trade needs' },
  { before: 'Wait on a developer to change a price', after: 'Change it yourself, in a sentence' },
  { before: 'A quote, a deposit, three weeks', after: 'Free to build, ₹0 until you want your own domain' },
];

export const EDIT_EXAMPLES: string[] = [
  'Make this look more premium.',
  'Change the colours to black and neon green.',
  'Add a pricing section.',
  'Rewrite the hero for a younger audience.',
  'Put the phone number in the header.',
  'Swap the paneer tikka for lamb chops, ₹480.',
];

export interface PublishFeature {
  title: string;
  body: string;
}

export const PUBLISH_FEATURES: PublishFeature[] = [
  { title: 'Custom domains', body: 'Bring a domain you already own. Lumen gives you the exact DNS records.' },
  { title: 'HTTPS', body: 'A certificate is issued and renewed for you. Nothing to configure.' },
  { title: 'Hosting included', body: 'Published sites are served from the platform. No separate bill, no server.' },
  { title: 'Built responsive', body: 'Every layout is designed for a phone and holds up on a desktop.' },
  { title: 'SEO on by default', body: 'Canonical addresses, a sitemap, social previews and local-business markup, written as the site is served.' },
  { title: 'Enquiries and orders', body: 'Forms land in your account, and can open in WhatsApp so they reach the phone you carry.' },
  { title: 'Analytics', body: 'Drop in a Google Analytics measurement ID from the connectors panel and it is on every page.' },
  { title: 'Integrations', body: 'GitHub, Vercel, Netlify, Mailchimp, Zapier, HubSpot, Slack, Notion, Airtable, Sheets and Razorpay.' },
  { title: 'Your code, exportable', body: 'Download the whole site as a zip or push it to GitHub. It is yours to take.' },
];

export interface Plan {
  name: string;
  price: string;
  note: string;
  features: string[];
  /** A plan you cannot buy yet says so, rather than collecting the click. */
  available: boolean;
  cta: string;
  href: string;
}

export const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '₹0',
    note: 'No card. Enough to build a site, look at it, and change your mind twice.',
    features: [
      `${WELCOME_CREDITS} credits when you sign up, ${DAILY_PLATFORM_CREDITS} more every day`,
      `A site costs ${CREDIT_COST.generation} credits to build and ${CREDIT_COST.chat_edit} per change`,
      'Every feature — shop, chatbot, voice, visual editor, export',
      'Publish to a lumensite.in address',
    ],
    available: true,
    cta: 'Start building',
    href: '/signup',
  },
  {
    name: 'Pro',
    price: `${PLAN_PRICE_LABEL}/month`,
    note: 'The same product, with room to work in. Paying buys throughput, not features — there are no feature gates on this product.',
    features: [
      `${PRO_DAILY_PLATFORM_CREDITS} credits a day instead of ${DAILY_PLATFORM_CREDITS}`,
      'Your own domain, with HTTPS',
      'GST-compliant invoices',
      'Or bring your own OpenAI key and have no ceiling at all',
    ],
    available: true,
    cta: 'See pricing',
    href: '/pricing',
  },
  {
    name: 'Business',
    price: 'Not yet',
    note: 'Teams, client projects and white-labelling are not built. When they are, this is where they will be — an empty card is better than selling something that does not exist.',
    features: ['Shared workspaces', 'Client handover', 'White-label publishing'],
    available: false,
    cta: 'Tell us what you need',
    href: '/support',
  },
];

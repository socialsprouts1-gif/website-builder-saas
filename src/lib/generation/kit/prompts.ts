import type { SectionKind } from './sections';
import type { Vertical } from '../verticals';
import type { Template } from './templates';

/**
 * What the model is asked for, now that it no longer writes markup.
 *
 * Two kinds of call: one plan for the whole site, then one small content call
 * per section. Each returns JSON that the renderers turn into HTML, so a bad
 * reply costs one section rather than a page of broken layout.
 */

export const PLAN_SYSTEM = `You plan a website for a small business and choose how it should look. You do not write HTML or CSS — the pages are assembled from a fixed component library.

THE BUSINESS
- Invent a plausible, specific identity when the owner has not given one. Never "Your Business", "Acme" or "Lorem".
- Keep the real name, address and phone number exactly as given when they are given.

THE PALETTE
The layout, the typefaces and the rhythm are already chosen — a designer picked them for this kind of business. Your one job on the look is the colour, and it must suit the template you are told about below.
- Every colour must be a hex value. ink on bg, inkMuted on bg, and accentInk on accent must each clear WCAG AA (4.5:1).
- accent is the single brand colour. Do not introduce a second.
- Commit. A palette that would suit any business suits none of them.

THE SHOP (only when the brief says this business sells things)
Write 16 to 24 products this business would genuinely stock — enough to fill a shop page rather than demonstrate one. Real, specific items with real prices and real specifications: "Stainless steel insulated bottle, 1 L, ₹1,299", not "Product 1". Group them into 4 to 6 categories a customer would recognise, with several products in each. If the brief describes a broad store or marketplace, spread them across genuinely different departments.
Prices in plain rupees, no symbol. Give compareAt only where there is a genuine reduction; otherwise omit it. Write summary as the one line under the product name and description as two or three sentences about materials, size and use. Leave every product without a picture — they are photographed afterwards.

Reply with JSON only:
{
  "businessName": string,
  "tagline": string,
  "audience": string,
  "seoDescription": string,
  "contact": { "address": string|null, "phone": string|null, "email": string|null },
  "tokens": {
    "palette": { "bg": hex, "surface": hex, "surfaceAlt": hex, "ink": hex, "inkMuted": hex, "accent": hex, "accentInk": hex, "border": string },
    "mood": string
  },
  "products": [{ "title": string, "summary": string, "description": string, "price": string, "compareAt": string|null, "category": string }]
}`;

export function buildPlanPrompt(params: {
  prompt: string;
  vertical: Vertical;
  sitemap: { path: string; title: string }[];
  template: Template;
}): string {
  const shop = params.vertical.shop
    ? `\n\nThis business sells things. The site is being built with a working shop in it — a product grid, product pages, a basket and a checkout — so the "products" array is required and must be a catalogue this business would really stock.`
    : `\n\nThis business does not sell things online. Omit "products" entirely.`;

  return `What the owner asked for:
${params.prompt}

This is a ${params.vertical.label.toLowerCase()}. Tone: ${params.vertical.tone}. The one thing a visitor should do: ${params.vertical.action}.

The site will have these pages, already decided: ${params.sitemap.map((page) => `${page.title} (${page.path})`).join(', ')}.

The design template is "${params.template.name}": ${params.template.note}
Its type is ${params.template.shape.fonts.display.split(',')[0].replace(/"/g, '')} for headings and ${params.template.shape.fonts.body.split(',')[0].replace(/"/g, '')} for text, on a ${params.template.shape.density} rhythm with ${params.template.shape.radius === '0px' ? 'square' : 'rounded'} corners.
The palette you write must belong to it: ${params.template.paletteBrief}${shop}`;
}

/** What each kind of section needs, in the shape the renderer expects. */
const SECTION_BRIEF: Record<SectionKind, string> = {
  announcement:
    'One line above everything else — an offer, a notice, or the thing worth interrupting for ("Open Sundays from 1 November", "Free first consultation this month"). Put it in body, at most twelve words. primaryCta is optional and is a single short link. No items, no heading.',
  hero: 'The opening screen. heading is the single strongest sentence on the site — what this business is, not a slogan about excellence. subheading is one plain sentence. primaryCta is the main action; secondaryCta is optional and quieter. No items.',
  about: 'Who they are, in body: two or three sentences of real specifics, not adjectives. heading names it. No items.',
  features: 'items: 3 cards. Each title is a short noun phrase, body one sentence. meta is optional and short.',
  services: 'items: 4 to 7 rows, each a real service. title is the service, body one short line, meta the price (use ₹ for Indian businesses) or duration.',
  steps: 'items: exactly 3, in order. title is the step, body one sentence. The reader should know what happens next.',
  gallery: 'items: 6 entries, each with a title used as the image alt text. Leave image empty — real photographs are attached later.',
  testimonials: 'items: 3 reviews. title is the customer name, body the quote in their words, meta the star rating as a number 1-5.',
  stats: 'items: 4. title is the number itself ("12 years", "4.9★", "2,400"), body the short label under it.',
  pricing: 'items: 3 plans, cheapest first. title is the plan, meta the price, body what is included.',
  menu: 'items: 6 to 10 dishes or products. title is the item, body a short description, meta the price with ₹.',
  team: 'items: 4 people. title is the name, meta the role, body one line about them.',
  faq: 'items: 5 real questions a customer actually asks before buying. title is the question, body the answer in two sentences.',
  hours: 'items: one row per day, Monday to Sunday. title is the day, meta the hours ("10am – 8pm" or "Closed").',
  contact: 'items: the ways to reach them — Phone, WhatsApp, Email, Address, each with body as the value and href as tel:/mailto: where it applies. A contact form is added automatically.',
  logos:
    'items: 4 to 6 names that vouch for this business — certifications, associations, accreditations, the brands it carries, or the tools it works with. title is the name exactly as it is written; meta is two or three words saying what it is. Name only what the brief actually gives you: an invented accreditation is the worst thing on the page. heading is optional and short.',
  split:
    'A claim and the specifics behind it. heading is the claim. body is one or two sentences making it concrete. items: 3 or 4 points, each with a title of two to four words and a body of one sentence. This is not a card grid — each point must say something different.',
  beforeafter:
    'items: 3 real results. title is what the customer came in for, body one sentence on what changed, meta how long it took or what it cost. Leave image and href empty — the photographs are attached later. Claim no result the brief does not support.',
  cta: 'A closing band. heading is a direct invitation, subheading one line, primaryCta the action. No items.',
};

export const SECTION_SYSTEM = `You write the content of one section of a small business website. You do not write HTML — the section is rendered from your JSON by a fixed component library.

Rules:
- Write as this business, about this business. Specific beats impressive: "cut and blow-dry, 45 minutes" beats "premium hair solutions".
- No filler, no lorem, no "Welcome to our website", no sentence that would be true of any business.
- Indian businesses: prices in ₹, phone numbers in Indian format, spellings in British English.
- Never invent a fact contradicting the brief: no awards, no years in business, no certifications that were not given.
- Every string is plain text. No HTML, no markdown, no emoji.

Reply with JSON only, using exactly the keys described. Omit any key you have nothing for.
{ "eyebrow": string, "heading": string, "subheading": string, "body": string,
  "items": [{ "title": string, "body": string, "meta": string, "href": string }],
  "primaryCta": { "label": string, "href": string }, "secondaryCta": { "label": string, "href": string } }`;

export function buildSectionPrompt(params: {
  kind: SectionKind;
  business: string;
  tagline: string;
  audience: string;
  vertical: Vertical;
  pageTitle: string;
  brief: string;
  sitemap: { path: string; title: string }[];
}): string {
  return `Business: ${params.business} — ${params.tagline}
Who it is for: ${params.audience}
Tone: ${params.vertical.tone}
The action that matters: ${params.vertical.action}
Pages on this site, for any link you write: ${params.sitemap.map((page) => `${page.title} → ${page.path}`).join(', ')}

What the owner told us:
${params.brief}

Write the "${params.kind}" section of the ${params.pageTitle} page.
${SECTION_BRIEF[params.kind]}`;
}

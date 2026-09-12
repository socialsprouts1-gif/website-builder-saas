import type { SectionKind } from './sections';
import type { Vertical } from '../verticals';

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

THE LOOK
Commit to a point of view. Two sites must not be mistakable for each other: a candlelit bistro is dim, warm and close; a gym is loud and high-contrast; a clinic is bright and calm.
- Every colour must be a hex value. text on bg, inkMuted on bg, and accentInk on accent must each clear WCAG AA (4.5:1).
- accent is the single brand colour. Do not introduce a second.
- fonts.display and fonts.body are CSS font stacks. If you name a Google font, give the exact https://fonts.googleapis.com stylesheet URL as googleHref and include a real system fallback in the stack. Otherwise set googleHref to null.
- density: "tight" for busy commercial sites, "airy" for calm ones, "regular" otherwise.
- texture: "flat", "gradient", "grain" or "rings" — the decorative treatment behind the hero.

Reply with JSON only:
{
  "businessName": string,
  "tagline": string,
  "audience": string,
  "seoDescription": string,
  "contact": { "address": string|null, "phone": string|null, "email": string|null },
  "tokens": {
    "palette": { "bg": hex, "surface": hex, "surfaceAlt": hex, "ink": hex, "inkMuted": hex, "accent": hex, "accentInk": hex, "border": string },
    "fonts": { "display": string, "body": string, "googleHref": string|null },
    "radius": string, "radiusLarge": string,
    "density": "tight"|"regular"|"airy",
    "texture": "flat"|"gradient"|"grain"|"rings",
    "mood": string
  }
}`;

export function buildPlanPrompt(params: {
  prompt: string;
  vertical: Vertical;
  sitemap: { path: string; title: string }[];
}): string {
  return `What the owner asked for:
${params.prompt}

This is a ${params.vertical.label.toLowerCase()}. Tone: ${params.vertical.tone}. The one thing a visitor should do: ${params.vertical.action}.

The site will have these pages, already decided: ${params.sitemap.map((page) => `${page.title} (${page.path})`).join(', ')}.`;
}

/** What each kind of section needs, in the shape the renderer expects. */
const SECTION_BRIEF: Record<SectionKind, string> = {
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

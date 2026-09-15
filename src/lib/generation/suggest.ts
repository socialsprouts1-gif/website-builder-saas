import type { SectionKind } from './kit/sections';
import { DEFAULT_VERTICAL, matchVertical, verticalBySlug, type Vertical } from './verticals';

/**
 * What this site is missing, and the sentence that would add it.
 *
 * A first build is the home page and a few others — not a finished shop. The
 * old answer to "where is the rest?" was that you had to know to ask for it, in
 * words the editor understood, which is no answer at all for someone who has
 * never built a website. So the site is read back and what is not there yet is
 * offered as something to press.
 *
 * Derived, never guessed: every section the generator writes carries
 * data-section="<kind>" in the markup, so "does this site have testimonials"
 * is a fact about the file rather than a judgement. Nothing already on the site
 * is ever offered, which is what keeps the list short and keeps it honest.
 */

export interface SiteFileLike {
  path: string;
  content: string;
}

export interface BuildSuggestion {
  id: string;
  /** A whole new page, or a section added to one that exists. */
  kind: 'page' | 'section';
  label: string;
  hint: string;
  /** The instruction sent to the editor, written the way it likes them. */
  prompt: string;
}

/** The section kinds present in a page, straight out of the markup. */
export function sectionsIn(html: string): Set<string> {
  const found = new Set<string>();
  for (const match of html.matchAll(/data-section="([a-z-]+)"/gi)) found.add(match[1].toLowerCase());
  return found;
}

interface SectionIdea {
  kind: SectionKind;
  label: string;
  hint: string;
  prompt: string;
  /** Only worth offering for these verticals. */
  only?: string[];
}

/**
 * Ordered by what does the most for a small business, not by section name:
 * something to sell, then proof, then the details people ring up to ask.
 */
const SECTION_IDEAS: SectionIdea[] = [
  {
    kind: 'services',
    label: 'Services & prices',
    hint: 'What you offer, with prices',
    prompt:
      'Add a services section to the home page listing what this business offers, each with a short description and a price or a "from" price. Match the existing page structure and styling exactly.',
  },
  {
    kind: 'gallery',
    label: 'Photo gallery',
    hint: 'Your work, in a grid',
    prompt:
      'Add a photo gallery section to the home page: a responsive grid of images with a short caption under each. Match the existing page structure and styling exactly.',
  },
  {
    kind: 'testimonials',
    label: 'Customer reviews',
    hint: 'Proof that people come back',
    prompt:
      'Add a testimonials section to the home page with three customer reviews in cards, each with the customer name and a star rating. Match the existing page structure and styling exactly.',
  },
  {
    kind: 'pricing',
    label: 'Price list',
    hint: 'Clear tiers, no guessing',
    prompt:
      'Add a pricing section to the home page with three tiers, each listing what is included and ending in a call to action. Match the existing page structure and styling exactly.',
  },
  {
    kind: 'faq',
    label: 'Frequently asked questions',
    hint: 'The six things people always ask',
    prompt:
      'Add a FAQ section with six questions and answers that expand when clicked, using only HTML and CSS. Match the existing page structure and styling exactly.',
  },
  {
    kind: 'hours',
    label: 'Opening hours',
    hint: 'In the footer and on contact',
    prompt:
      'Add an opening hours block laid out day by day, both in the site footer on every page and on the contact page. Match the existing page structure and styling exactly.',
  },
  {
    kind: 'contact',
    label: 'Enquiry form',
    hint: 'Name, phone, message',
    prompt:
      'Add an enquiry form with name, phone and message fields to the contact page, and a short version of it in the footer. Match the existing page structure and styling exactly.',
  },
  {
    kind: 'team',
    label: 'Meet the team',
    hint: 'Faces build trust',
    prompt:
      'Add a team section introducing the people who work here, each with a name, role and one line about them. Match the existing page structure and styling exactly.',
  },
  {
    kind: 'stats',
    label: 'Numbers worth showing',
    hint: 'Years open, customers served',
    prompt:
      'Add a stats band to the home page with four numbers that build confidence, such as years in business, customers served, and rating. Match the existing page structure and styling exactly.',
  },
  {
    kind: 'steps',
    label: 'How it works',
    hint: 'Three or four steps',
    prompt:
      'Add a "how it works" section explaining what happens from first enquiry to finished job, in three or four numbered steps. Match the existing page structure and styling exactly.',
  },
  {
    kind: 'menu',
    label: 'The menu',
    hint: 'Dishes, grouped by course',
    prompt:
      'Add a menu section grouped by course, each dish with a short description and a price. Match the existing page structure and styling exactly.',
    only: ['restaurant'],
  },
];

/**
 * A shop's "services" is a product catalogue, and calling it services would be
 * the sort of wording that makes someone think the product cannot do it.
 */
const RENAMED: Record<string, Partial<Record<SectionKind, Pick<SectionIdea, 'label' | 'hint' | 'prompt'>>>> = {
  retail: {
    services: {
      label: 'Product catalogue',
      hint: 'Products with photos and prices',
      prompt:
        'Add a product catalogue section to the home page: a responsive grid of product cards, each with an image, a name, a short description and a price, and a button to enquire. Match the existing page structure and styling exactly.',
    },
  },
  restaurant: {
    services: {
      label: 'What we serve',
      hint: 'Your dishes, with prices',
      prompt:
        'Add a section to the home page showing what this place serves, each item with a short description and a price. Match the existing page structure and styling exactly.',
    },
  },
};

/** The vertical this project was built as, however little we know about it. */
export function verticalFor(slug: string | null | undefined, hint: string): Vertical {
  return (slug ? verticalBySlug(slug) : undefined) ?? (hint.trim() ? matchVertical(hint) : DEFAULT_VERTICAL);
}

const MAX_SUGGESTIONS = 6;

export function suggestNext(
  files: SiteFileLike[],
  options: { verticalSlug?: string | null; hint?: string } = {},
): BuildSuggestion[] {
  const pages = files.filter((file) => file.path.toLowerCase().endsWith('.html'));
  if (pages.length === 0) return [];

  const paths = new Set(pages.map((file) => file.path.toLowerCase()));
  const present = new Set<string>();
  for (const page of pages) for (const kind of sectionsIn(page.content)) present.add(kind);

  const vertical = verticalFor(options.verticalSlug, options.hint ?? '');
  const out: BuildSuggestion[] = [];

  // Pages the plan called for that are not there. First, because a missing
  // page is a broken link in the navigation, not just an absence.
  for (const page of vertical.pages) {
    if (paths.has(page.path.toLowerCase())) continue;
    out.push({
      id: `page:${page.path}`,
      kind: 'page',
      label: `Create the ${page.title} page`,
      hint: 'A new page, linked from the menu',
      prompt:
        `Create a new page at ${page.path} titled "${page.title}", built from the same header, footer, ` +
        `stylesheet and section markup as the existing pages so it is indistinguishable from them. ` +
        `It should contain these sections in order: ${page.sections.join(', ')}. ` +
        `Also add it to the navigation on every existing page.`,
    });
  }

  for (const idea of SECTION_IDEAS) {
    if (out.length >= MAX_SUGGESTIONS) break;
    if (idea.only && !idea.only.includes(vertical.slug)) continue;
    if (present.has(idea.kind)) continue;

    const renamed = RENAMED[vertical.slug]?.[idea.kind];
    out.push({
      id: `section:${idea.kind}`,
      kind: 'section',
      label: renamed?.label ?? idea.label,
      hint: renamed?.hint ?? idea.hint,
      prompt: renamed?.prompt ?? idea.prompt,
    });
  }

  return out.slice(0, MAX_SUGGESTIONS);
}

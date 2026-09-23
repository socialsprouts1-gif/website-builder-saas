import type { SectionKind } from './sections';

/**
 * The layouts a section can actually take.
 *
 * Until now every section kind had exactly one renderer: a hero was always a
 * headline beside a photograph, features were always three cards, a gallery
 * was always a three-column grid. Two sites therefore differed only in their
 * colours, which is why everything Lumen produced looked like the same site
 * wearing a different shirt.
 *
 * A layout is a genuinely different arrangement of the same content, not a
 * variation in spacing. The template decides which one each kind uses, so the
 * choice is made once for the whole site and the result is coherent rather
 * than a scrapbook.
 */

export const LAYOUTS = {
  announcement: ['bar', 'centred'],
  hero: ['split', 'centre', 'fullbleed', 'editorial', 'showcase'],
  about: ['split', 'offset', 'statement'],
  features: ['cards', 'bento', 'numbered', 'ticker', 'checks'],
  services: ['rows', 'cards', 'index', 'numbered'],
  steps: ['cards', 'timeline', 'numbered'],
  gallery: ['grid', 'mosaic', 'rail', 'stack', 'feed'],
  testimonials: ['cards', 'feature', 'ticker'],
  stats: ['band', 'cards', 'inline'],
  pricing: ['cards', 'table'],
  menu: ['rows', 'cards', 'index', 'numbered'],
  team: ['cards', 'rail'],
  faq: ['list', 'split'],
  hours: ['rows', 'inline', 'location'],
  contact: ['split', 'stacked'],
  cta: ['band', 'panel', 'full'],
  logos: ['row', 'grid', 'band'],
  split: ['points', 'columns', 'media'],
  beforeafter: ['pairs', 'stack'],
} as const satisfies Record<SectionKind, readonly string[]>;

export type LayoutFor<K extends SectionKind> = (typeof LAYOUTS)[K][number];
export type AnyLayout = (typeof LAYOUTS)[SectionKind][number];

/** Every layout name, for validation. */
const ALL = new Set<string>(Object.values(LAYOUTS).flat());

export function isLayout(value: unknown): value is AnyLayout {
  return typeof value === 'string' && ALL.has(value);
}

/**
 * The layout a section will actually be drawn with.
 *
 * A template may name one; anything it does not name, or names wrongly, falls
 * back to the first for that kind — which is the layout every site had before
 * templates existed, so an unknown value degrades to the old behaviour rather
 * than to an empty page.
 */
export function layoutFor(kind: SectionKind, wanted: string | undefined): string {
  const allowed = LAYOUTS[kind] as readonly string[];
  return wanted && allowed.includes(wanted) ? wanted : allowed[0];
}

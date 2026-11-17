import type { SectionKind } from '@/lib/generation/kit/sections';
import type { BlueprintPage } from './types';

/**
 * Shorthand for writing page architectures.
 *
 * A blueprint's value is entirely in the order of its sections, so the data has
 * to be readable as a list — the moment it takes six lines per page nobody
 * checks whether a clinic's home page really opens the way a clinic's home page
 * should.
 */
export const page = (path: string, title: string, ...sections: SectionKind[]): BlueprintPage => ({
  path,
  title,
  sections,
});

export const home = (...sections: SectionKind[]): BlueprintPage => page('index.html', 'Home', ...sections);

/** Contact is the same everywhere, because the question is the same everywhere. */
export const CONTACT = page('contact.html', 'Contact', 'hero', 'contact', 'hours', 'faq');

/**
 * Contact for a place people physically go to.
 *
 * It carries the map, which CONTACT does not: a business customers visit is
 * found by somebody standing on the pavement with a phone, and "Get
 * directions" is the only button on the page some of them will ever press. A
 * business people only ring has an address that is nobody's destination.
 */
export const VISIT = page('contact.html', 'Visit', 'hero', 'contact', 'map', 'hours', 'faq');

/**
 * The three pages a shop adds, and where the catalogue renders into them.
 *
 * Taken from the vertical definitions rather than re-declared: the basket and
 * the checkout are filled from the database when the page is served, and a
 * blueprint that spelled those paths itself would be one rename away from a
 * shop with no basket.
 */
export { SHOP_PAGES, SHOP_HOME_SLOTS } from '@/lib/generation/verticals';

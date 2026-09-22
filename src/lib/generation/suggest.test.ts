import { describe, expect, it } from 'vitest';
import { sectionsIn, suggestNext, verticalFor } from './suggest';
import { verticalBySlug } from './verticals';

/** A page the generator would have written, marked up the way it marks up. */
const page = (kinds: string[]) =>
  `<html><body><main>${kinds
    .map((kind, index) => `<section id="${kind}-${index}" data-section="${kind}">x</section>`)
    .join('')}</main></body></html>`;

describe('sectionsIn', () => {
  it('reads what a page already has out of the markup', () => {
    expect([...sectionsIn(page(['hero', 'services']))].sort()).toEqual(['hero', 'services']);
    expect([...sectionsIn('<p>hi</p>')]).toEqual([]);
  });
});

describe('suggestNext', () => {
  // Someone at an event asked for an e-commerce site and got a home page. The
  // only way to get the rest was to know to ask, in the right words.
  const shopHome = [{ path: 'index.html', content: page(['hero', 'gallery', 'features', 'testimonials', 'cta']) }];
  const suggestions = suggestNext(shopHome, { hint: 'an ecommerce store selling sarees' });
  const labels = suggestions.map((item) => item.label);

  it('recognises what kind of business it is', () => {
    expect(verticalFor(null, 'an ecommerce store selling sarees').slug).toBe('retail');
  });

  it('offers the pages the plan called for but that are missing', () => {
    expect(suggestions[0].kind).toBe('page');
    expect(labels.some((label) => /Shop/i.test(label))).toBe(true);
    expect(labels.some((label) => /Contact/i.test(label))).toBe(true);
  });

  /**
   * It used to offer "Product catalogue" here: a static grid of pictures with
   * prices printed under them and a button that opened an enquiry form. A
   * retail site has a real shop now — products, a basket, a checkout — so
   * offering the painted-on version beside it would be offering a worse copy
   * of what the site already has.
   */
  it('offers a shop rather than a picture of one', () => {
    expect(labels).not.toContain('Product catalogue');
    expect(labels).not.toContain('Services & prices');
    expect(labels.some((label) => /Shop/i.test(label))).toBe(true);
  });

  /** The basket and the checkout are part of the shop, not pages to write. */
  it('never offers to build a basket or a checkout page', () => {
    expect(labels.some((label) => /basket/i.test(label))).toBe(false);
    expect(labels.some((label) => /checkout/i.test(label))).toBe(false);
  });

  // The promise that keeps the list short and keeps it honest. Scoped to
  // sections: a Gallery *page* is still worth offering to a site whose home
  // page happens to carry a gallery section, and those are different things.
  it('never offers a section the site already has', () => {
    const sections = suggestions.filter((item) => item.kind === 'section');
    expect(sections.some((item) => item.id === 'section:gallery')).toBe(false);
    expect(sections.some((item) => item.id === 'section:testimonials')).toBe(false);
  });

  it('stays short enough to read', () => {
    expect(suggestions.length).toBeLessThanOrEqual(6);
  });

  it('has no pages left to offer once they all exist', () => {
    // Built from the vertical itself, so adding a page to the plan can never
    // quietly leave this test asserting about a site shape that no longer
    // exists.
    const full = verticalBySlug('retail')!.pages.map((entry) => ({
      path: entry.path,
      content: page(entry.sections.length > 0 ? entry.sections : ['hero']),
    }));

    const later = suggestNext(full, { hint: 'ecommerce store' });
    expect(later.filter((item) => item.kind === 'page')).toHaveLength(0);
    expect(later.some((item) => item.id === 'section:pricing')).toBe(true);
  });

  it('offers a cafe its menu, and never offers one to a salon', () => {
    const cafe = suggestNext([{ path: 'index.html', content: page(['hero', 'about', 'cta']) }], {
      hint: 'a cafe in Pune',
    });
    expect(cafe.some((item) => item.id === 'page:menu.html')).toBe(true);

    const salon = suggestNext([{ path: 'index.html', content: page(['hero', 'about', 'cta']) }], {
      hint: 'a hair salon',
    });
    expect(salon.some((item) => item.id === 'section:menu')).toBe(false);
  });

  it('writes instructions the editor can act on', () => {
    const pages = suggestions.filter((item) => item.kind === 'page');
    expect(pages.every((item) => /\.html/.test(item.prompt))).toBe(true);
    // A new page nobody can navigate to is a broken link, not a page.
    expect(pages.every((item) => /navigation/i.test(item.prompt))).toBe(true);
    expect(new Set(suggestions.map((item) => item.id)).size).toBe(suggestions.length);
  });

  it('has nothing to suggest about nothing', () => {
    expect(suggestNext([])).toEqual([]);
    expect(suggestNext([{ path: 'styles.css', content: 'body{}' }])).toEqual([]);
  });
});

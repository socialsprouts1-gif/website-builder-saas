import { describe, expect, it } from 'vitest';
import { hasShopMarker, shopMarker, shopSection, stripShopMarkers } from './inject';

/**
 * What a site built to sell things looks like when there is no shop to serve.
 *
 * This is the failure that produced "no product cards, no product pages, no
 * add to cart, no checkout": the build ran against a database with no product
 * tables, every read returned empty by design, and the markers the shop fills
 * on each request were left in the page as sections with headings and nothing
 * underneath. The site was not missing a shop so much as displaying the hole
 * where one should have been.
 *
 * Building one of these is refused now, before any credits are spent. This is
 * the second line: if a page ever is served without its shop, it reads as a
 * finished site that does not sell online.
 */
const PAGE = `<!doctype html><html><body><main>
<section class="section" data-section="hero"><div class="shell"><h1>Neura Shops</h1></div></section>
${shopSection('featured', 'Shop the collection')}
${shopSection('categories')}
<section class="section" data-section="contact"><div class="shell"><h2>Find us</h2></div></section>
</main></body></html>`;

describe('a page served without its shop', () => {
  const stripped = stripShopMarkers(PAGE);

  it('keeps no empty band behind', () => {
    expect(hasShopMarker(stripped)).toBe(false);
    expect(stripped).not.toContain('data-lumen-shop');
    expect(stripped).not.toContain('data-section="shop"');
  });

  it('takes the heading with the band, not just the grid under it', () => {
    expect(PAGE).toContain('Shop the collection');
    expect(stripped).not.toContain('Shop the collection');
  });

  it('leaves every other section of the page exactly as it was', () => {
    expect(stripped).toContain('Neura Shops');
    expect(stripped).toContain('Find us');
    expect(stripped).toContain('data-section="hero"');
  });

  it('removes a bare marker that is not wrapped in a band', () => {
    expect(stripShopMarkers(`<div>${shopMarker('cart')}</div>`)).toBe('<div></div>');
  });

  it('does nothing to a page that never had a shop', () => {
    const plain = '<main><section class="section"><h1>Clinic</h1></section></main>';
    expect(stripShopMarkers(plain)).toBe(plain);
  });
});

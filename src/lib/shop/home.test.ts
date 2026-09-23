import { describe, expect, it } from 'vitest';
import { categoryTiles, featuredProducts } from './render';
import { fillShopMarkers, shopSection, type ShopView } from './inject';
import { renderPage, type SiteSpec } from '@/lib/generation/kit/page';
import { normaliseTokens } from '@/lib/generation/kit/tokens';
import { verticalBySlug, SHOP_HOME_SLOTS } from '@/lib/generation/verticals';
import type { Product } from './catalogue';

const LINKS = { base: '/s/shop/' };

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  slug: 'kurta',
  title: 'Cotton kurta',
  description: null,
  summary: null,
  pricePaise: 49900,
  compareAtPaise: null,
  category: 'Clothing',
  images: ['https://cdn.test/a.jpg'],
  stock: null,
  active: true,
  position: 0,
  ...over,
});

const catalogue = [
  product({ id: '1', title: 'Kurta', category: 'Clothing', position: 0 }),
  product({ id: '2', title: 'Saree', category: 'Clothing', position: 1 }),
  product({ id: '3', title: 'Lamp', category: 'Home', position: 2 }),
  product({ id: '4', title: 'Kettle', category: 'Kitchen', position: 3 }),
];

const view: ShopView = {
  products: catalogue,
  rates: [],
  codEnabled: true,
  paymentUrl: null,
  paymentNote: null,
  endpoint: '/api/shop/x/orders',
  links: LINKS,
  storageKey: 'x',
  inline: false,
};

describe('featuredProducts', () => {
  it('shows real products with a way to buy them', () => {
    const html = featuredProducts(catalogue, { links: LINKS });
    expect(html).toContain('Kurta');
    expect(html).toContain('data-shop-add=');
    expect(html).toContain('₹499');
  });

  it('offers the rest of the shop rather than stopping there', () => {
    expect(featuredProducts(catalogue, { links: LINKS })).toContain('/s/shop/shop.html');
  });

  it('shows nothing at all rather than an empty band', () => {
    expect(featuredProducts([], { links: LINKS })).toBe('');
    expect(featuredProducts([product({ active: false })], { links: LINKS })).toBe('');
  });

  it('keeps the home page from becoming the whole catalogue', () => {
    const many = Array.from({ length: 40 }, (_unused, index) =>
      product({ id: `p${index}`, title: `Thing ${index}`, position: index }),
    );
    const html = featuredProducts(many, { links: LINKS });
    expect((html.match(/data-shop-add=/g) ?? []).length).toBeLessThanOrEqual(8);
  });
});

describe('categoryTiles', () => {
  it('lists the departments with a count and a picture', () => {
    const html = categoryTiles(catalogue, { links: LINKS });
    expect(html).toContain('Clothing');
    expect(html).toContain('2 items');
    expect(html).toContain('1 item');
    expect(html).toContain('category=Clothing');
  });

  /** One department is not a set of departments. */
  it('says nothing when a shop has only one category', () => {
    expect(categoryTiles([product({ category: 'Only' })], { links: LINKS })).toBe('');
    expect(categoryTiles([product({ category: null })], { links: LINKS })).toBe('');
  });

  it('will not put a javascript URL in a tile', () => {
    const html = categoryTiles(
      [
        product({ id: '1', category: 'A', images: ['javascript:alert(1)'] }),
        product({ id: '2', category: 'B' }),
      ],
      { links: LINKS },
    );
    expect(html).not.toContain('javascript:');
  });
});

describe('the home page of a shop', () => {
  const site: SiteSpec = {
    businessName: 'Shop',
    tagline: 'Tagline',
    pages: [{ path: 'index.html', title: 'Home' }],
    contact: {},
    tokens: normaliseTokens(null),
  };

  /**
   * The complaint this exists for: an e-commerce home page whose first screen
   * has nothing to buy on it, and a link to a Shop page instead.
   */
  it('carries products and departments, not just a link to them', () => {
    const retail = verticalBySlug('retail')!;
    const home = retail.pages.find((page) => page.path === 'index.html')!;
    expect(home.shopBands).toEqual(SHOP_HOME_SLOTS);

    const file = renderPage(site, {
      path: 'index.html',
      title: 'Home',
      description: '',
      sections: [
        { id: 'hero', kind: 'hero', heading: 'Hello' },
        { id: 'cta', kind: 'cta', heading: 'Buy' },
      ],
      extra: home.shopBands!.map((slot) => shopSection(slot)).join('\n'),
      extraAfter: 1,
    });

    expect(file).toContain('data-lumen-shop="featured"');
    expect(file).toContain('data-lumen-shop="categories"');

    const served = fillShopMarkers(file, view, null);
    expect(served).toContain('Kurta');
    expect(served).toContain('Clothing');
    expect(served).toContain('data-shop-add=');
  });

  /** Products below the closing call to action are products nobody scrolls to. */
  it('puts them under the hero rather than at the bottom of the page', () => {
    const file = renderPage(site, {
      path: 'index.html',
      title: 'Home',
      description: '',
      sections: [
        { id: 'hero', kind: 'hero', heading: 'Hello' },
        { id: 'cta', kind: 'cta', heading: 'Buy' },
      ],
      extra: shopSection('featured'),
      extraAfter: 1,
    });

    expect(file.indexOf('data-lumen-shop="featured"')).toBeGreaterThan(file.indexOf('id="hero"'));
    expect(file.indexOf('data-lumen-shop="featured"')).toBeLessThan(file.indexOf('id="cta"'));
  });

  it('still appends when nothing says where to put it', () => {
    const file = renderPage(site, {
      path: 'shop.html',
      title: 'Shop',
      description: '',
      sections: [{ id: 'hero', kind: 'hero', heading: 'Shop' }],
      extra: shopSection('shop'),
    });
    expect(file.indexOf('data-lumen-shop="shop"')).toBeGreaterThan(file.indexOf('id="hero"'));
  });
});

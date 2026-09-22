import { describe, expect, it } from 'vitest';
import { renderPage, type SiteSpec } from './kit/page';
import { shopSection } from '@/lib/shop/inject';
import { fillShopMarkers, withShopNav, type ShopView } from '@/lib/shop/inject';
import { matchVertical, verticalBySlug } from './verticals';
import { normaliseTokens } from './kit/tokens';
import type { Product } from '@/lib/shop/catalogue';

const site: SiteSpec = {
  businessName: 'Aanchal Handloom',
  tagline: 'Hand-woven cotton from Akola',
  pages: [
    { path: 'index.html', title: 'Home' },
    { path: 'shop.html', title: 'Shop' },
    { path: 'contact.html', title: 'Contact' },
  ],
  contact: {},
  tokens: normaliseTokens(null),
};

const product: Product = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'cotton-saree',
  title: 'Cotton saree',
  description: null,
  summary: null,
  pricePaise: 149900,
  compareAtPaise: null,
  category: 'Sarees',
  images: [],
  stock: null,
  active: true,
  position: 0,
};

const view: ShopView = {
  products: [product],
  rates: [],
  codEnabled: true,
  paymentUrl: null,
  paymentNote: null,
  endpoint: '/api/shop/aanchal/orders',
  links: { base: '/s/aanchal/' },
  storageKey: 'aanchal',
  inline: false,
};

describe('a shop the builder produces', () => {
  it('routes an e-commerce brief to the vertical that has a shop', () => {
    for (const brief of [
      'an ecommerce website for my saree shop',
      'online store selling handmade jewellery',
      'I want to sell products with a cart and checkout',
    ]) {
      expect(matchVertical(brief).shop).toBe(true);
    }
  });

  it('does not put a shop on a business that does not sell things', () => {
    expect(matchVertical('a dental clinic in Pune').shop).toBeFalsy();
    expect(matchVertical('coaching institute for NEET').shop).toBeFalsy();
  });

  it('plans a shop, a basket and a checkout, and keeps the last two out of the nav', () => {
    const retail = verticalBySlug('retail')!;
    const paths = retail.pages.map((page) => page.path);
    expect(paths).toContain('shop.html');
    expect(paths).toContain('cart.html');
    expect(paths).toContain('checkout.html');

    const hidden = retail.pages.filter((page) => page.hidden).map((page) => page.path);
    expect(hidden).toEqual(['cart.html', 'checkout.html']);
  });

  it('writes a page with an empty marker rather than a frozen copy of the shop', () => {
    const html = renderPage(site, {
      path: 'shop.html',
      title: 'Shop — Aanchal Handloom',
      description: 'Hand-woven cotton',
      sections: [],
      extra: shopSection('shop'),
    });

    expect(html).toContain('data-lumen-shop="shop"');
    // Nothing about any particular product is baked into the file.
    expect(html).not.toContain('Cotton saree');
  });

  it('gives the basket and checkout their own editable heading', () => {
    const html = renderPage(site, {
      path: 'cart.html',
      title: 'Your basket',
      description: '',
      sections: [],
      extra: shopSection('cart', 'Your basket'),
    });
    expect(html).toContain('<h1 data-lumen-id="shop-cart-heading">Your basket</h1>');
  });

  /** The whole point of the marker: served, it becomes the live catalogue. */
  it('fills the marker with the catalogue when the page is served', () => {
    const file = renderPage(site, {
      path: 'shop.html',
      title: 'Shop',
      description: '',
      sections: [],
      extra: shopSection('shop'),
    });

    const served = fillShopMarkers(file, view, null);
    expect(served).toContain('Cotton saree');
    expect(served).toContain('₹1,499');
    expect(served).toContain('data-shop-add="11111111-1111-4111-8111-111111111111"');
  });

  it('puts a basket in the header of every page of the site', () => {
    const home = renderPage(site, {
      path: 'index.html',
      title: 'Home',
      description: '',
      sections: [],
    });

    const served = withShopNav(home, view);
    expect(served).toContain('href="/s/aanchal/cart.html"');
    expect(served).toContain('data-shop-count');
  });

  /** A shop section must not be offered again as something still to build. */
  it('marks the shop section so the site knows it already has one', () => {
    expect(shopSection('shop')).toContain('data-section="shop"');
  });
});

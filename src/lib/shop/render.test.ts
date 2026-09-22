import { describe, expect, it } from 'vitest';
import { categoryBar, checkoutPage, productCard, productPage, safeImage, shopGrid } from './render';
import type { Product, ShippingRate } from './catalogue';

const LINKS = { base: '/s/kits/' };

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  slug: 'cotton-kurta',
  title: 'Cotton kurta',
  description: null,
  summary: null,
  pricePaise: 49900,
  compareAtPaise: null,
  category: 'Kurtas',
  images: ['https://cdn.example.com/kurta.jpg'],
  stock: null,
  active: true,
  position: 0,
  ...over,
});

describe('safeImage', () => {
  /** This lands in a src on a page served from Lumen's own domain. */
  it('refuses anything that is not a real picture address', () => {
    expect(safeImage('javascript:alert(1)')).toBeNull();
    expect(safeImage('data:text/html,<script>')).toBeNull();
    expect(safeImage('  ')).toBeNull();
    expect(safeImage(null)).toBeNull();
    expect(safeImage(`https://x.test/${'a'.repeat(3000)}.jpg`)).toBeNull();
  });

  it('accepts http, https and root-relative', () => {
    expect(safeImage('https://cdn.test/a.jpg')).toBe('https://cdn.test/a.jpg');
    expect(safeImage('/uploads/a.jpg')).toBe('/uploads/a.jpg');
  });

  it('escapes a quote so it cannot break out of the attribute', () => {
    expect(safeImage('https://x.test/a.jpg?a="onerror="x')).not.toContain('"');
  });
});

describe('productCard', () => {
  it('links to the product and carries what the basket needs', () => {
    const html = productCard(product(), LINKS);
    expect(html).toContain('href="/s/kits/shop/cotton-kurta"');
    expect(html).toContain('data-shop-add="p1"');
    expect(html).toContain('data-shop-price="49900"');
    expect(html).toContain('₹499');
  });

  it('will not let a product name write markup', () => {
    const html = productCard(product({ title: '<img src=x onerror=alert(1)>' }), LINKS);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  /** Escaped once, by `safeImage`. Twice broke every URL with a query in it. */
  it('carries the picture into the basket without mangling it', () => {
    const url = 'https://cdn.test/a.jpg?w=400&h=400';
    const html = productCard(product({ images: [url] }), LINKS);
    expect(html).toContain('data-shop-image="https://cdn.test/a.jpg?w=400&amp;h=400"');
    expect(html).not.toContain('&amp;amp;');
  });

  it('offers no button at all when it is sold out', () => {
    const html = productCard(product({ stock: 0 }), LINKS);
    expect(html).toContain('Sold out');
    expect(html).not.toContain('data-shop-add');
  });

  it('shows the old price and the saving when there is one', () => {
    const html = productCard(product({ pricePaise: 50000, compareAtPaise: 100000 }), LINKS);
    expect(html).toContain('₹1,000');
    expect(html).toContain('50% off');
  });
});

describe('categoryBar', () => {
  it('is absent when a shop has only one category', () => {
    expect(categoryBar([product()], null, LINKS)).toBe('');
  });

  it('lists the categories with Everything first', () => {
    const html = categoryBar(
      [product({ id: '1', category: 'Kurtas' }), product({ id: '2', category: 'Sarees' })],
      'Sarees',
      LINKS,
    );
    expect(html).toContain('Everything');
    expect(html).toContain('href="/s/kits/shop.html?category=Sarees"');
    expect(html).toContain('shop-chip--on');
  });

  it('escapes a category into the query string', () => {
    const html = categoryBar(
      [product({ id: '1', category: 'Tops & tees' }), product({ id: '2', category: 'Sarees' })],
      null,
      LINKS,
    );
    expect(html).toContain('category=Tops%20%26%20tees');
  });
});

describe('shopGrid', () => {
  it('says so plainly when the shop is empty', () => {
    expect(shopGrid([], { links: LINKS })).toContain('no products in it yet');
  });

  it('shows only the chosen category', () => {
    const html = shopGrid(
      [product({ id: '1', title: 'Kurta A', category: 'Kurtas' }), product({ id: '2', title: 'Saree B', category: 'Sarees' })],
      { category: 'sarees', links: LINKS },
    );
    expect(html).toContain('Saree B');
    expect(html).not.toContain('Kurta A');
  });

  it('offers a way back when a category turns out to be empty', () => {
    const html = shopGrid([product({ category: 'Kurtas' }), product({ id: '2', category: 'Sarees' })], {
      category: 'Shoes',
      links: LINKS,
    });
    expect(html).toContain('See everything');
  });

  it('leaves switched-off products out', () => {
    const html = shopGrid([product({ id: 'off', title: 'Hidden thing', active: false })], { links: LINKS });
    expect(html).not.toContain('Hidden thing');
  });
});

describe('productPage', () => {
  it('shows the price, the description and a way to buy', () => {
    const html = productPage(product({ description: 'Hand block printed.' }), [], LINKS);
    expect(html).toContain('Cotton kurta');
    expect(html).toContain('Hand block printed.');
    expect(html).toContain('data-shop-qty');
    expect(html).toContain('data-shop-add="p1"');
  });

  it('warns when stock is nearly gone', () => {
    expect(productPage(product({ stock: 3 }), [], LINKS)).toContain('Only 3 left');
    expect(productPage(product({ stock: 40 }), [], LINKS)).not.toContain('left</p>');
  });

  it('never suggests itself as something else to look at', () => {
    const html = productPage(product(), [product(), product({ id: 'p2', title: 'Other' })], LINKS);
    expect(html).toContain('Other');
    expect(html.match(/data-shop-add="p1"/g)).toHaveLength(1);
  });

  it('has no quantity box when it cannot be bought', () => {
    expect(productPage(product({ stock: 0 }), [], LINKS)).not.toContain('data-shop-qty');
  });
});

describe('checkoutPage', () => {
  const rate = (over: Partial<ShippingRate> = {}): ShippingRate => ({
    id: 'r1',
    label: 'Standard',
    note: '3–5 days',
    pricePaise: 5000,
    freeOverPaise: null,
    position: 0,
    active: true,
    ...over,
  });

  it('checks the first delivery option by default', () => {
    const html = checkoutPage({
      rates: [rate({ id: 'a' }), rate({ id: 'b', position: 1 })],
      codEnabled: true,
      paymentUrl: null,
      paymentNote: null,
      endpoint: '/api/shop/kits/orders',
      links: LINKS,
    });
    expect(html).toContain('value="a" checked');
    expect(html).not.toContain('value="b" checked');
  });

  it('says the free-delivery threshold out loud', () => {
    const html = checkoutPage({
      rates: [rate({ freeOverPaise: 99900 })],
      codEnabled: true,
      paymentUrl: null,
      paymentNote: null,
      endpoint: '/e',
      links: LINKS,
    });
    expect(html).toContain('free over ₹999');
  });

  /** Never a promise the shop cannot keep. */
  it('promises payment on delivery only when that is switched on', () => {
    const cod = checkoutPage({ rates: [], codEnabled: true, paymentUrl: null, paymentNote: null, endpoint: '/e', links: LINKS });
    expect(cod).toContain('Pay on delivery');

    const neither = checkoutPage({ rates: [], codEnabled: false, paymentUrl: null, paymentNote: null, endpoint: '/e', links: LINKS });
    expect(neither).toContain('arrange payment');
    expect(neither).not.toContain('Pay on delivery');
  });

  it('uses the owner’s own words when they gave some', () => {
    const html = checkoutPage({
      rates: [],
      codEnabled: false,
      paymentUrl: 'https://rzp.io/l/abc',
      paymentNote: 'UPI only, please.',
      endpoint: '/e',
      links: LINKS,
    });
    expect(html).toContain('UPI only, please.');
  });

  it('says delivery is arranged later when no rates are set up', () => {
    const html = checkoutPage({ rates: [], codEnabled: true, paymentUrl: null, paymentNote: null, endpoint: '/e', links: LINKS });
    expect(html).toContain('arranged with you after the order');
  });
});

import { describe, expect, it } from 'vitest';
import {
  categoriesOf,
  discountPercent,
  inCategory,
  inStock,
  isReduced,
  maxQuantity,
  offeredRates,
  productSlug,
  sellableProducts,
  uniqueSlug,
  type Product,
  type ShippingRate,
} from './catalogue';

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p',
  slug: 'p',
  title: 'Thing',
  description: null,
  summary: null,
  pricePaise: 10000,
  compareAtPaise: null,
  category: null,
  images: [],
  stock: null,
  active: true,
  position: 0,
  ...over,
});

describe('sellableProducts', () => {
  it('hides the switched-off ones and keeps the owner’s order', () => {
    const list = sellableProducts([
      product({ id: 'c', title: 'Third', position: 2 }),
      product({ id: 'x', title: 'Hidden', active: false, position: 0 }),
      product({ id: 'a', title: 'First', position: 1 }),
    ]);
    expect(list.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('falls back to alphabetical when positions tie', () => {
    const list = sellableProducts([product({ id: 'b', title: 'Banana' }), product({ id: 'a', title: 'Apple' })]);
    expect(list.map((item) => item.title)).toEqual(['Apple', 'Banana']);
  });
});

describe('inStock and maxQuantity', () => {
  /** Most small shops do not count stock, and must not be forced to. */
  it('treats an uncounted product as always available', () => {
    expect(inStock(product({ stock: null }))).toBe(true);
    expect(maxQuantity(product({ stock: null }))).toBe(99);
  });

  it('treats zero as sold out', () => {
    expect(inStock(product({ stock: 0 }))).toBe(false);
    expect(maxQuantity(product({ stock: 0 }))).toBe(0);
  });

  it('never offers more than there are', () => {
    expect(maxQuantity(product({ stock: 4 }))).toBe(4);
    expect(maxQuantity(product({ stock: 5000 }))).toBe(99);
  });
});

describe('isReduced and discountPercent', () => {
  it('is on offer only when the old price was genuinely higher', () => {
    expect(isReduced(product({ pricePaise: 50000, compareAtPaise: 80000 }))).toBe(true);
    expect(isReduced(product({ pricePaise: 50000, compareAtPaise: 50000 }))).toBe(false);
    expect(isReduced(product({ pricePaise: 50000, compareAtPaise: 40000 }))).toBe(false);
    expect(isReduced(product({ compareAtPaise: null }))).toBe(false);
  });

  it('rounds the saving the way a shop writes it', () => {
    expect(discountPercent(product({ pricePaise: 50000, compareAtPaise: 100000 }))).toBe(50);
    expect(discountPercent(product({ pricePaise: 74900, compareAtPaise: 99900 }))).toBe(25);
    expect(discountPercent(product({ compareAtPaise: null }))).toBeNull();
  });

  /** "1% off" on a rounding error is not an offer. */
  it('does not claim an offer worth less than a percent', () => {
    expect(discountPercent(product({ pricePaise: 99999, compareAtPaise: 100000 }))).toBeNull();
  });
});

describe('categoriesOf', () => {
  it('lists what the shop actually stocks, in the order it stocks it', () => {
    expect(
      categoriesOf([
        product({ id: '1', category: 'Sarees', position: 0 }),
        product({ id: '2', category: 'Kurtas', position: 1 }),
        product({ id: '3', category: 'Sarees', position: 2 }),
      ]),
    ).toEqual(['Sarees', 'Kurtas']);
  });

  it('does not offer a category whose only product is hidden', () => {
    expect(categoriesOf([product({ category: 'Gone', active: false })])).toEqual([]);
  });

  it('treats the same name typed differently as one category', () => {
    const list = categoriesOf([
      product({ id: '1', category: 'Sarees' }),
      product({ id: '2', category: ' sarees ' }),
    ]);
    expect(list).toEqual(['Sarees']);
  });

  it('ignores products with no category', () => {
    expect(categoriesOf([product({ category: null }), product({ id: '2', category: '  ' })])).toEqual([]);
  });
});

describe('inCategory', () => {
  it('matches however it was typed', () => {
    expect(inCategory(product({ category: 'Sarees' }), ' sarees ')).toBe(true);
    expect(inCategory(product({ category: 'Sarees' }), 'kurtas')).toBe(false);
    expect(inCategory(product({ category: null }), 'sarees')).toBe(false);
  });
});

describe('productSlug', () => {
  it('makes a title into an address', () => {
    expect(productSlug('Cotton Kurta — Blue')).toBe('cotton-kurta-blue');
    expect(productSlug('  Spaced   Out  ')).toBe('spaced-out');
  });

  /** This ends up in an href on a page we serve. Nothing else may survive. */
  it('strips anything that is not a letter, a digit or a hyphen', () => {
    expect(productSlug('<script>alert(1)</script>')).toBe('script-alert-1-script');
    expect(productSlug('price ₹499 / 50% off')).toBe('price-499-50-off');
  });

  it('never returns an empty address', () => {
    expect(productSlug('₹₹₹')).toBe('item');
    expect(productSlug('')).toBe('item');
  });

  it('does not end on a hyphen after truncation', () => {
    const slug = productSlug(`${'a'.repeat(59)} tail`);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug.length).toBeLessThanOrEqual(60);
  });
});

describe('uniqueSlug', () => {
  it('leaves a free name alone', () => {
    expect(uniqueSlug('Blue kurta', ['red-kurta'])).toBe('blue-kurta');
  });

  it('numbers a name that is taken', () => {
    expect(uniqueSlug('Blue kurta', ['blue-kurta'])).toBe('blue-kurta-2');
    expect(uniqueSlug('Blue kurta', ['blue-kurta', 'blue-kurta-2'])).toBe('blue-kurta-3');
  });

  it('does not care how the existing one was capitalised', () => {
    expect(uniqueSlug('Blue kurta', ['BLUE-KURTA'])).toBe('blue-kurta-2');
  });
});

describe('offeredRates', () => {
  const rate = (over: Partial<ShippingRate>): ShippingRate => ({
    id: 'r',
    label: 'R',
    note: null,
    pricePaise: 0,
    freeOverPaise: null,
    position: 0,
    active: true,
    ...over,
  });

  it('hides switched-off rates and keeps the owner’s order', () => {
    const list = offeredRates([
      rate({ id: 'b', position: 1 }),
      rate({ id: 'off', active: false, position: 0 }),
      rate({ id: 'a', position: 0 }),
    ]);
    expect(list.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('puts the cheaper first when positions tie', () => {
    const list = offeredRates([rate({ id: 'pricey', pricePaise: 9000 }), rate({ id: 'cheap', pricePaise: 100 })]);
    expect(list[0].id).toBe('cheap');
  });
});

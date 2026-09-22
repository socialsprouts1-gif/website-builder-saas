import { describe, expect, it } from 'vitest';
import { orderReference, orderTotals, priceCart, shippingFor, subtotalOf } from './cart';
import type { Product, ShippingRate } from './catalogue';

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  slug: 'kurta',
  title: 'Cotton kurta',
  description: null,
  summary: null,
  pricePaise: 49900,
  compareAtPaise: null,
  category: 'Clothing',
  images: [],
  stock: null,
  active: true,
  position: 0,
  ...over,
});

const rate = (over: Partial<ShippingRate> = {}): ShippingRate => ({
  id: 'r1',
  label: 'Standard',
  note: null,
  pricePaise: 5000,
  freeOverPaise: null,
  position: 0,
  active: true,
  ...over,
});

describe('priceCart', () => {
  /** The whole point: the browser says how many, never how much. */
  it('prices from the catalogue and ignores anything the browser claims', () => {
    const lines = priceCart(
      [{ productId: 'p1', quantity: 2, unitPaise: 1 } as never],
      [product()],
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].unitPaise).toBe(49900);
    expect(lines[0].linePaise).toBe(99800);
  });

  it('drops a product that does not exist, is switched off, or is sold out', () => {
    const catalogue = [
      product({ id: 'gone', active: false }),
      product({ id: 'empty', stock: 0 }),
    ];
    const lines = priceCart(
      [
        { productId: 'gone', quantity: 1 },
        { productId: 'empty', quantity: 1 },
        { productId: 'never-existed', quantity: 1 },
      ],
      catalogue,
    );
    expect(lines).toEqual([]);
  });

  /** Three left and ten asked for means three sold, not nothing sold. */
  it('clamps a quantity to what is on the shelf', () => {
    const lines = priceCart([{ productId: 'p1', quantity: 10 }], [product({ stock: 3 })]);
    expect(lines[0].quantity).toBe(3);
    expect(lines[0].linePaise).toBe(149700);
  });

  it('refuses quantities that are not whole and positive', () => {
    const catalogue = [product()];
    expect(priceCart([{ productId: 'p1', quantity: 0 }], catalogue)).toEqual([]);
    expect(priceCart([{ productId: 'p1', quantity: -3 }], catalogue)).toEqual([]);
    expect(priceCart([{ productId: 'p1', quantity: Number.NaN }], catalogue)).toEqual([]);
    expect(priceCart([{ productId: 'p1', quantity: 1.9 }], catalogue)[0].quantity).toBe(1);
  });

  it('caps an uncounted product at a sane basket size', () => {
    const lines = priceCart([{ productId: 'p1', quantity: 5000 }], [product({ stock: null })]);
    expect(lines[0].quantity).toBe(99);
  });
});

describe('shippingFor', () => {
  it('charges the rate', () => {
    expect(shippingFor(rate(), 20000)).toBe(5000);
  });

  /** "Free over ₹999" has to be free *at* ₹999. */
  it('is free at the threshold, not only above it', () => {
    const free = rate({ freeOverPaise: 99900 });
    expect(shippingFor(free, 99899)).toBe(5000);
    expect(shippingFor(free, 99900)).toBe(0);
    expect(shippingFor(free, 200000)).toBe(0);
  });

  it('costs nothing when there is no rate at all', () => {
    expect(shippingFor(null, 100000)).toBe(0);
  });
});

describe('orderTotals', () => {
  const catalogue = [product({ id: 'a', pricePaise: 30000 }), product({ id: 'b', pricePaise: 12550 })];
  const rates = [rate({ id: 'slow', pricePaise: 4000, position: 0 }), rate({ id: 'fast', pricePaise: 15000, position: 1 })];

  it('adds the basket up and puts the chosen delivery on top', () => {
    const totals = orderTotals(
      [
        { productId: 'a', quantity: 2 },
        { productId: 'b', quantity: 1 },
      ],
      catalogue,
      rates,
      'fast',
    );
    expect(totals.subtotalPaise).toBe(72550);
    expect(totals.shippingPaise).toBe(15000);
    expect(totals.totalPaise).toBe(87550);
    expect(totals.count).toBe(3);
    expect(totals.rate?.id).toBe('fast');
  });

  /** Falling through to nothing would hand the delivery cost to the owner. */
  it('falls back to the first rate when the chosen one is not on offer', () => {
    const totals = orderTotals([{ productId: 'a', quantity: 1 }], catalogue, rates, 'invented');
    expect(totals.rate?.id).toBe('slow');
    expect(totals.shippingPaise).toBe(4000);
  });

  it('charges no delivery on an empty basket', () => {
    const totals = orderTotals([{ productId: 'nope', quantity: 1 }], catalogue, rates, 'fast');
    expect(totals.totalPaise).toBe(0);
    expect(totals.shippingPaise).toBe(0);
    expect(totals.rate).toBeNull();
  });

  it('says what it could not sell', () => {
    const totals = orderTotals(
      [
        { productId: 'a', quantity: 1 },
        { productId: 'ghost', quantity: 1 },
      ],
      catalogue,
      rates,
      null,
    );
    expect(totals.rejected).toEqual([{ productId: 'ghost', reason: 'unknown' }]);
    expect(totals.lines).toHaveLength(1);
  });

  it('ignores an inactive rate', () => {
    const totals = orderTotals(
      [{ productId: 'a', quantity: 1 }],
      catalogue,
      [rate({ id: 'off', active: false, pricePaise: 1 }), rate({ id: 'on', pricePaise: 6000, position: 1 })],
      'off',
    );
    expect(totals.rate?.id).toBe('on');
    expect(totals.shippingPaise).toBe(6000);
  });
});

describe('subtotalOf', () => {
  it('is zero for nothing', () => {
    expect(subtotalOf([])).toBe(0);
  });
});

describe('orderReference', () => {
  it('reads unambiguously over a phone', () => {
    const reference = orderReference(() => 0.5);
    expect(reference).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    // Nothing that gets misheard: no O against 0, no I or 1.
    expect(reference).not.toMatch(/[OI01BS]/);
  });

  it('varies', () => {
    const many = new Set(Array.from({ length: 200 }, () => orderReference()));
    expect(many.size).toBeGreaterThan(150);
  });
});

import { describe, expect, it } from 'vitest';
import { defaultRates, MAX_STARTERS, toProductRows } from './seed';

describe('toProductRows', () => {
  it('turns a starter catalogue into rows with paise prices', () => {
    const rows = toProductRows('proj', [
      { title: 'Banarasi silk saree', price: '4,500', category: 'Sarees', summary: 'Hand woven' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      project_id: 'proj',
      slug: 'banarasi-silk-saree',
      title: 'Banarasi silk saree',
      price_paise: 450000,
      category: 'Sarees',
      summary: 'Hand woven',
    });
  });

  /** A shop is a place where things have names and prices. */
  it('drops anything without a title or a real price', () => {
    const rows = toProductRows('p', [
      { title: '', price: '100' },
      { title: 'No price' },
      { title: 'Free thing', price: '0' },
      { title: 'Nonsense price', price: 'ask us' },
      { title: 'Good one', price: '100' },
    ]);
    expect(rows.map((row) => row.title)).toEqual(['Good one']);
  });

  it('gives two products with the same name different addresses', () => {
    const rows = toProductRows('p', [
      { title: 'Cotton kurta', price: '499' },
      { title: 'Cotton kurta', price: '599' },
    ]);
    expect(rows.map((row) => row.slug)).toEqual(['cotton-kurta', 'cotton-kurta-2']);
  });

  /** A crossed-out price that is not higher is a lie printed on a shop. */
  it('keeps a compare-at price only when it is genuinely a reduction', () => {
    const [real] = toProductRows('p', [{ title: 'A', price: '400', compareAt: '800' }]);
    expect(real.compare_at_paise).toBe(80000);

    const [fake] = toProductRows('p', [{ title: 'B', price: '400', compareAt: '400' }]);
    expect(fake.compare_at_paise).toBeNull();

    const [lower] = toProductRows('p', [{ title: 'C', price: '400', compareAt: '100' }]);
    expect(lower.compare_at_paise).toBeNull();
  });

  it('never invents a photograph', () => {
    const [row] = toProductRows('p', [{ title: 'A', price: '100' }]);
    expect(row.images).toEqual([]);
  });

  it('numbers the products in the order they were written', () => {
    const rows = toProductRows('p', [
      { title: 'First', price: '1' },
      { title: 'Second', price: '2' },
    ]);
    expect(rows.map((row) => row.position)).toEqual([0, 1]);
  });

  /**
   * A shop opens with enough to look like a shop, and stops well short of
   * letting one enthusiastic reply fill it with a hundred invented things.
   */
  it('opens with a full grid but does not run away', () => {
    const many = Array.from({ length: 80 }, (_unused, index) => ({ title: `Item ${index}`, price: '100' }));
    expect(toProductRows('p', many)).toHaveLength(MAX_STARTERS);
    expect(MAX_STARTERS).toBeGreaterThanOrEqual(16);
    expect(MAX_STARTERS).toBeLessThanOrEqual(30);
  });

  it('is empty for a business that sells nothing', () => {
    expect(toProductRows('p', [])).toEqual([]);
  });
});

describe('defaultRates', () => {
  it('opens with a standard and an express option', () => {
    const rates = defaultRates('p');
    expect(rates).toHaveLength(2);
    expect(rates[0].free_over_paise).toBe(99900);
    expect(rates[1].price_paise).toBeGreaterThan(rates[0].price_paise);
  });
});

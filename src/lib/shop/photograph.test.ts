import { describe, expect, it } from 'vitest';
import { MAX_PHOTOGRAPHS, productPrompt, type Photographable } from './photograph';

const product = (over: Partial<Photographable> = {}): Photographable => ({
  id: 'p1',
  title: 'Stainless steel insulated bottle, 1 L',
  summary: 'Double-wall bottle that keeps drinks hot or cold for hours',
  description: null,
  category: 'Kitchen & Dining',
  ...over,
});

describe('productPrompt', () => {
  it('asks for this product rather than a generic scene', () => {
    const prompt = productPrompt(product(), 'Aanchal Stores');
    expect(prompt).toContain('Stainless steel insulated bottle, 1 L');
    expect(prompt).toContain('Double-wall bottle');
    expect(prompt).toContain('Aanchal Stores');
  });

  /**
   * A shop grid shows a tile about 300 pixels square. A lifestyle photograph
   * at that size is a brown blur; a single object on a sweep is legible.
   */
  it('asks for one object on a plain background, not a lifestyle shot', () => {
    const prompt = productPrompt(product(), 'Shop');
    expect(prompt).toMatch(/one single product/i);
    expect(prompt).toMatch(/plain seamless light background/i);
    expect(prompt).toMatch(/no people/i);
    expect(prompt).toMatch(/no props/i);
  });

  /** A rendered brand name on a made-up product is a claim that is not true. */
  it('refuses text, logos and watermarks', () => {
    const prompt = productPrompt(product(), 'Shop');
    expect(prompt).toMatch(/no text/i);
    expect(prompt).toMatch(/no logos/i);
    expect(prompt).toMatch(/no watermark/i);
  });

  it('falls back to the description when there is no summary', () => {
    const prompt = productPrompt(
      product({ summary: null, description: 'Hand block printed cotton, 2.5 metres' }),
      'Shop',
    );
    expect(prompt).toContain('Hand block printed cotton');
  });

  it('copes with a product that has nothing but a name', () => {
    const prompt = productPrompt(product({ summary: null, description: null }), 'Shop');
    expect(prompt).toContain('Stainless steel');
    expect(prompt.length).toBeGreaterThan(100);
  });

  /** One build must not be able to spend an afternoon's budget. */
  it('never lets a prompt run away with a huge description', () => {
    const prompt = productPrompt(product({ summary: 'x'.repeat(5000) }), 'Shop');
    expect(prompt.length).toBeLessThan(900);
  });
});

describe('how many get photographed', () => {
  it('is enough to fill a shop and capped so a build cannot run wild', () => {
    expect(MAX_PHOTOGRAPHS).toBeGreaterThanOrEqual(16);
    expect(MAX_PHOTOGRAPHS).toBeLessThanOrEqual(30);
  });
});

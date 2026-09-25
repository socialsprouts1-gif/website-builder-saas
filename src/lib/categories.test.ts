import { describe, expect, it } from 'vitest';
import { CATEGORIES, HERO_CATEGORIES, categoryBySlug } from './categories';
import { detectIndustry } from './templates';

/**
 * The chips are the first thing anybody touches, and a chip that seeds a prompt
 * Lumen then files under the wrong industry is worse than no chip: it produces
 * a confidently wrong site.
 */
describe('the businesses somebody can start from', () => {
  it('offers more than a handful', () => {
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(20);
    expect(HERO_CATEGORIES.length).toBe(CATEGORIES.length);
  });

  it('has unique slugs and labels', () => {
    const slugs = CATEGORIES.map((category) => category.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const labels = CATEGORIES.map((category) => category.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('is findable by slug', () => {
    expect(categoryBySlug('fashion')?.label).toBe('Clothing');
    expect(categoryBySlug('nothing-like-this')).toBeUndefined();
  });

  /**
   * The seed prompt is what a chip actually sends. If the industry detector
   * cannot place it, the visitor is offered three unrelated templates.
   */
  it.each(CATEGORIES.map((category) => [category.slug, category] as const))(
    '%s seeds a prompt Lumen can place',
    (_slug, category) => {
      expect(category.seedPrompt.length).toBeGreaterThan(30);
      expect(detectIndustry(category.seedPrompt), category.seedPrompt).not.toBeNull();
    },
  );

  it('seeds a shop for the ones that sell things', () => {
    for (const slug of ['ecommerce', 'fashion', 'jewellery']) {
      const seed = categoryBySlug(slug)!.seedPrompt.toLowerCase();
      expect(seed, slug).toMatch(/checkout|order|shop|storefront|catalogue/);
    }
  });
});

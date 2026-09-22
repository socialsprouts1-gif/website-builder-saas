import { describe, expect, it } from 'vitest';
import { DEFAULT_VERTICAL, VERTICALS, matchVertical, verticalBySlug } from './verticals';
import { templatesFor } from './kit/templates';

describe('the verticals', () => {
  it('gives every trade a unique slug', () => {
    const slugs = VERTICALS.map((vertical) => vertical.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every trade a home page and a way to be contacted', () => {
    for (const vertical of [...VERTICALS, DEFAULT_VERTICAL]) {
      const paths = vertical.pages.map((page) => page.path);
      expect(paths, vertical.slug).toContain('index.html');
      expect(paths, vertical.slug).toContain('contact.html');
      expect(vertical.pages.length).toBeGreaterThanOrEqual(3);
    }
  });

  /** A trade with no look of its own falls through to the house style. */
  it('has a template to build every trade with', () => {
    for (const vertical of [...VERTICALS, DEFAULT_VERTICAL]) {
      expect(templatesFor(vertical.slug).length).toBeGreaterThan(0);
    }
  });

  it.each([
    ['a wedding photographer in Pune', 'photography'],
    ['interior design studio for modular kitchens', 'interiors'],
    ['chartered accountant doing GST filing', 'legal'],
    ['car service centre and denting painting', 'automotive'],
    ['homestay and trekking packages in Manali', 'travel'],
    ['organic farm selling fresh produce', 'agriculture'],
    ['a software agency building apps', 'agency'],
    ['strength and conditioning gym', 'gym'],
    ['family dental clinic in Akola', 'clinic'],
  ])('routes "%s" to the %s shape', (brief, slug) => {
    expect(matchVertical(brief).slug).toBe(slug);
  });

  it('falls back to a competent general site when nothing matches', () => {
    expect(matchVertical('qwertyuiop asdfgh').slug).toBe(DEFAULT_VERTICAL.slug);
    expect(matchVertical('').slug).toBe(DEFAULT_VERTICAL.slug);
  });

  it('finds a vertical by slug', () => {
    expect(verticalBySlug('photography')?.label).toContain('Photography');
    expect(verticalBySlug('nope')).toBeUndefined();
  });
});

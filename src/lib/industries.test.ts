import { describe, expect, it } from 'vitest';
import { IDEAS } from './ideas';
import { INDUSTRIES, ideaFor, industryBySlug, industryForIdea, industryPrompt } from './industries';

describe('the per-trade pages', () => {
  it('each point at an idea that exists', () => {
    for (const industry of INDUSTRIES) {
      expect(() => ideaFor(industry), industry.slug).not.toThrow();
    }
  });

  it('cover every idea, so none loses its page when ideas.ts is edited', () => {
    for (const idea of IDEAS) {
      expect(industryForIdea(idea.slug), `no /for page shows the "${idea.slug}" idea`).toBeDefined();
    }
  });

  it('claim one idea each, so two pages cannot show the same mock', () => {
    const used = INDUSTRIES.map((industry) => industry.idea);
    expect(new Set(used).size).toBe(used.length);
  });

  it('have URL-safe, distinct slugs', () => {
    const slugs = INDUSTRIES.map((industry) => industry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
  });

  it('are findable by slug', () => {
    expect(industryBySlug('restaurant-website')?.idea).toBe('bistro');
    expect(industryBySlug('nothing-like-this')).toBeUndefined();
  });

  /**
   * The title is what shows in the result. Google rewrites one over about 60
   * characters, which throws away the wording that was chosen on purpose.
   */
  it('have titles short enough to survive a search result', () => {
    for (const industry of INDUSTRIES) {
      expect(industry.title.length, industry.slug).toBeLessThanOrEqual(60);
    }
  });

  it('have descriptions in the range a snippet actually shows', () => {
    for (const industry of INDUSTRIES) {
      expect(industry.description.length, industry.slug).toBeGreaterThan(70);
      expect(industry.description.length, industry.slug).toBeLessThanOrEqual(175);
    }
  });

  it('say something different from each other above the fold', () => {
    const intros = INDUSTRIES.map((industry) => industry.intro);
    expect(new Set(intros).size).toBe(intros.length);
    const h1s = INDUSTRIES.map((industry) => industry.h1);
    expect(new Set(h1s).size).toBe(h1s.length);
  });

  it('hand the generator the same design direction the page showed', () => {
    const industry = INDUSTRIES[0];
    const prompt = industryPrompt(industry);
    expect(prompt).toContain(ideaFor(industry).direction.palette.accent);
  });
});

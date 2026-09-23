import { describe, expect, it } from 'vitest';
import { layoutFor } from '@/lib/generation/kit/layouts';
import { designOf, verticalOf, type SitePlan } from '@/lib/generation/pipeline';
import { FALLBACK_TOKENS } from '@/lib/generation/kit/tokens';
import { matchVertical } from '@/lib/generation/verticals';
import { BLUEPRINTS, blueprintById, blueprintDesign, blueprintVertical } from './index';

/**
 * The promise the whole template system makes: pick a template and that is the
 * site you get.
 *
 * The failure this guards against is silent and was nearly shipped — a build
 * runs as four separate invocations, and the two after the plan re-resolved the
 * structure from the vertical slug rather than the blueprint. A clinic planned
 * with a fourteen-section template would have been written and saved as the old
 * seven-section one, and the template would have decided nothing at all.
 */
describe('a build from a template', () => {
  const blueprint = blueprintById('nova')!;

  it('uses the template pages, not the vertical defaults', () => {
    const chosen = blueprintVertical(blueprint);
    const guessed = matchVertical('dental clinic in Akola');

    expect(chosen.pages).toBe(blueprint.pages);
    // The page count can coincide; the architecture is what must not.
    expect(chosen.pages.map((page) => page.sections.join(','))).not.toEqual(
      guessed.pages.map((page) => page.sections.join(',')),
    );
    expect(chosen.pages[0].sections.length).toBeGreaterThan(guessed.pages[0].sections.length);
  });

  it('keeps the tone and the shop behaviour of the vertical it inherits from', () => {
    const chosen = blueprintVertical(blueprint);
    const base = matchVertical('dental clinic');
    expect(chosen.tone).toBe(base.tone);
    expect(chosen.action).toBe(blueprint.action);
  });

  it('draws with the template’s layouts rather than the defaults', () => {
    const design = blueprintDesign(blueprint);
    expect(layoutFor('features', design.layouts.features)).toBe('checks');
    // The default for this kind, which is what a site got before templates.
    expect(layoutFor('features', undefined)).toBe('cards');
  });

  it('gives every template a home page longer than the old default', () => {
    const before = matchVertical('').pages[0].sections.length;
    for (const entry of BLUEPRINTS) {
      const home = blueprintVertical(entry).pages[0];
      expect(home.sections.length, entry.id).toBeGreaterThan(before);
    }
  });

  /**
   * The spec's rule, as a test: AI may replace a section with a
   * industry-specific one, never quietly drop the section that made the page
   * worth building. Structure is data, so it cannot be dropped at all.
   */
  it('cannot lose a section between planning and saving', () => {
    for (const entry of BLUEPRINTS) {
      const planned = blueprintVertical(entry);
      const saved = blueprintVertical(entry);
      expect(saved.pages.map((page) => page.sections.join(',')), entry.id).toEqual(
        planned.pages.map((page) => page.sections.join(',')),
      );
    }
  });
});

describe('the steps after the plan', () => {
  const plan = (over: Partial<SitePlan>): SitePlan => ({
    businessName: 'SmileCare Dental',
    tagline: 'Family dentistry in Akola',
    audience: 'Local families',
    seoDescription: 'x',
    contact: {},
    tokens: FALLBACK_TOKENS,
    verticalSlug: 'clinic',
    templateId: 'nova',
    ...over,
  });

  /**
   * This is the bug the whole file exists for. A build is four invocations;
   * the plan chose the template, and the two steps after it looked the
   * structure up again from the vertical slug. Everything worked, and the
   * template silently decided nothing.
   */
  it('write and save the pages the template chose, not the vertical defaults', () => {
    const withTemplate = verticalOf({ plan: plan({ blueprintId: 'nova' }) });
    const withoutTemplate = verticalOf({ plan: plan({}) });

    expect(withTemplate.pages).toBe(blueprintById('nova')!.pages);
    expect(withTemplate.pages[0].sections.length).toBeGreaterThan(
      withoutTemplate.pages[0].sections.length,
    );
  });

  it('draw with the template’s own design rather than falling back to the default', () => {
    const design = designOf(plan({ blueprintId: 'nova' }));
    expect(design.id).toBe('nova');
    expect(design.layouts.features).toBe('checks');

    // A blueprint id is not a design template id, so without the blueprint
    // this lookup finds nothing and lands on the default.
    expect(designOf(plan({})).id).not.toBe('nova');
  });

  it('leave a site built before templates existed exactly as it was', () => {
    const legacy = verticalOf({ plan: plan({}) });
    expect(legacy.slug).toBe('clinic');
    expect(legacy.pages).toBe(matchVertical('dental clinic').pages);
  });
});

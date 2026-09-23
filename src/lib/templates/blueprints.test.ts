import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '@/lib/generation/kit/layouts';
import { isSectionKind } from '@/lib/generation/kit/sections';
import { TEMPLATES } from '@/lib/generation/kit/templates';
import { VERTICALS } from '@/lib/generation/verticals';
import {
  BLUEPRINTS,
  blueprintById,
  blueprintCard,
  blueprintDesign,
  blueprintVertical,
  detectIndustry,
  filterBlueprints,
  recommendBlueprints,
  TEMPLATE_INDUSTRIES,
} from './index';
import { sectionCount } from './types';

/**
 * Quality control for the library, run on every commit rather than by eye.
 *
 * A blueprint is data, and data rots quietly: a design template renamed, a
 * layout that no longer exists, a page architecture that lost its contact page.
 * None of that throws — it produces a site that is subtly worse than the one
 * before it, which is the failure this whole system exists to stop.
 */
describe('every blueprint', () => {
  it.each(BLUEPRINTS.map((blueprint) => [blueprint.id, blueprint] as const))(
    '%s is coherent',
    (_id, blueprint) => {
      // Files on disk, not guesses.
      expect(TEMPLATES.some((design) => design.id === blueprint.design), 'design').toBe(true);
      expect(VERTICALS.some((vertical) => vertical.slug === blueprint.vertical), 'vertical').toBe(true);
      expect(
        TEMPLATE_INDUSTRIES.some((industry) => industry.slug === blueprint.industry),
        'industry',
      ).toBe(true);

      // Every layout it names has to exist, or the section silently falls back
      // to the default and the blueprint stops being distinctive.
      for (const [kind, layout] of Object.entries(blueprint.layouts ?? {})) {
        expect(isSectionKind(kind), `${kind} is not a section kind`).toBe(true);
        const allowed = LAYOUTS[kind as keyof typeof LAYOUTS] as readonly string[];
        expect(allowed, `${kind} has no layouts`).toBeDefined();
        expect(allowed.includes(layout), `${kind} has no "${layout}" layout`).toBe(true);
      }

      for (const page of blueprint.pages) {
        for (const kind of page.sections) {
          expect(isSectionKind(kind), `${blueprint.id}/${page.path}: ${kind}`).toBe(true);
        }
      }
    },
  );

  it.each(BLUEPRINTS.map((blueprint) => [blueprint.id, blueprint] as const))(
    '%s is a whole website',
    (_id, blueprint) => {
      const visible = blueprint.pages.filter((page) => !page.hidden);
      expect(visible.length, 'pages').toBeGreaterThanOrEqual(2);
      expect(visible[0].path, 'first page').toBe('index.html');
      expect(
        blueprint.pages.some((page) => page.path === 'contact.html'),
        'a way to get in touch',
      ).toBe(true);

      // The complaint this was built to answer: a home page that was seven
      // blocks and looked like a placeholder.
      const homeSections = visible[0].sections.length;
      expect(homeSections, 'sections on the home page').toBeGreaterThanOrEqual(8);
      expect(sectionCount(blueprint), 'sections in total').toBeGreaterThanOrEqual(20);
    },
  );

  it.each(BLUEPRINTS.map((blueprint) => [blueprint.id, blueprint] as const))(
    '%s opens and closes properly',
    (_id, blueprint) => {
      for (const page of blueprint.pages.filter((p) => !p.hidden && p.sections.length > 0)) {
        expect(page.sections[0] === 'hero' || page.sections[0] === 'announcement', `${page.path} opens`).toBe(
          true,
        );
        // An announcement bar is chrome; it cannot be the only thing at the top.
        if (page.sections[0] === 'announcement') expect(page.sections[1], `${page.path}`).toBe('hero');
      }
    },
  );

  it('has no repeated section on a single page', () => {
    for (const blueprint of BLUEPRINTS) {
      for (const page of blueprint.pages) {
        const seen = page.sections.filter((kind) => kind !== 'hero');
        expect(new Set(seen).size, `${blueprint.id}/${page.path}`).toBe(seen.length);
      }
    }
  });

  it('has unique ids and names', () => {
    const ids = BLUEPRINTS.map((blueprint) => blueprint.id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = BLUEPRINTS.map((blueprint) => blueprint.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('the library as a whole', () => {
  it('covers every industry it offers as a filter', () => {
    for (const industry of TEMPLATE_INDUSTRIES) {
      const count = BLUEPRINTS.filter((blueprint) => blueprint.industry === industry.slug).length;
      expect(count, `${industry.slug} has no templates`).toBeGreaterThanOrEqual(2);
    }
  });

  /** One template per industry is a theme, not a choice. */
  it('gives the main industries more than one look', () => {
    for (const slug of ['health', 'food', 'retail', 'software', 'fitness', 'beauty']) {
      const count = BLUEPRINTS.filter((blueprint) => blueprint.industry === slug).length;
      expect(count, slug).toBeGreaterThanOrEqual(3);
    }
  });

  it('does not build every industry out of the same design', () => {
    for (const industry of TEMPLATE_INDUSTRIES) {
      const inIndustry = BLUEPRINTS.filter((blueprint) => blueprint.industry === industry.slug);
      if (inIndustry.length < 3) continue;
      const designs = new Set(inIndustry.map((blueprint) => blueprint.design));
      const styles = new Set(inIndustry.map((blueprint) => blueprint.style));
      expect(designs.size + styles.size, industry.slug).toBeGreaterThanOrEqual(4);
    }
  });

  it('marks a shop as a shop, and only a shop gets shop pages', () => {
    for (const blueprint of BLUEPRINTS) {
      const hasShopPages = blueprint.pages.some((page) => page.shopSlot || page.shopBands);
      expect(hasShopPages, blueprint.id).toBe(blueprint.features.includes('shop'));
    }
  });
});

describe('composing a blueprint into a design', () => {
  const blueprint = blueprintById('nova')!;

  it('keeps the design template it is built on and overrides on top', () => {
    const design = blueprintDesign(blueprint);
    expect(design.name).toBe('Nova');
    expect(design.layouts.features).toBe('checks');
    // Not named by the blueprint, so it comes from the design template.
    expect(design.shape.fonts.display).toBeTruthy();
  });

  it('hands the generator the blueprint pages, not the vertical defaults', () => {
    expect(blueprintVertical(blueprint).pages).toBe(blueprint.pages);
    expect(blueprintVertical(blueprint).action).toBe(blueprint.action);
  });

  it('counts sections and pages for the card rather than trusting a number', () => {
    const card = blueprintCard(blueprint);
    expect(card.sections).toBe(sectionCount(blueprint));
    expect(card.pages).toBe(blueprint.pages.filter((page) => !page.hidden).length);
  });
});

describe('finding a template', () => {
  it('finds the dental ones from the word a person types', () => {
    expect(detectIndustry('I need a website for my dental clinic in Akola')).toBe('health');
    expect(detectIndustry('gym with classes')).toBe('fitness');
    expect(detectIndustry('online store for sarees')).toBe('retail');
  });

  it('prefers the longer match, so a phrase beats a word inside it', () => {
    expect(detectIndustry('computer classes institute')).toBe('education');
    expect(detectIndustry('car dealership showroom')).toBe('automotive');
  });

  it('admits when it does not know instead of filing it wrongly', () => {
    expect(detectIndustry('something entirely unrelated to any listed trade')).toBeNull();
  });

  it('always offers three, even for a business it does not recognise', () => {
    expect(recommendBlueprints('a business nobody has thought of').length).toBe(3);
    const recommended = recommendBlueprints('dental clinic');
    expect(recommended.length).toBe(3);
    expect(recommended.every((blueprint) => blueprint.industry === 'health')).toBe(true);
  });

  it('spreads the fallback across industries rather than offering three of one', () => {
    const industries = recommendBlueprints('xyzzy').map((blueprint) => blueprint.industry);
    expect(new Set(industries).size).toBe(industries.length);
  });

  it('searches the words somebody would actually type', () => {
    expect(filterBlueprints({ query: 'dentist' }).length).toBeGreaterThan(0);
    expect(filterBlueprints({ query: 'wedding' }).length).toBeGreaterThan(0);
    expect(filterBlueprints({ query: 'coffee shop' }).length).toBeGreaterThan(0);
    expect(filterBlueprints({ query: 'zzzz' })).toEqual([]);
  });

  it('filters by what the site needs to do', () => {
    const shops = filterBlueprints({ feature: 'shop' });
    expect(shops.length).toBeGreaterThan(0);
    expect(shops.every((blueprint) => blueprint.features.includes('shop'))).toBe(true);
  });
});

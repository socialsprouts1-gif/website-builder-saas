import { describe, expect, it } from 'vitest';
import { chooseTemplate, DEFAULT_TEMPLATE, TEMPLATES, templateById, templatesFor } from './templates';
import { isLayout, LAYOUTS } from './layouts';
import { SECTION_KINDS, type SectionKind } from './sections';

describe('the template catalogue', () => {
  it('gives every template a unique id', () => {
    const ids = TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The whole point. If two templates named the same layout for every kind
   * they would be the same template in different colours, which is the thing
   * this was built to stop.
   */
  it('makes every template a different shape, not a different palette', () => {
    const shapes = TEMPLATES.map((template) => JSON.stringify(template.layouts));
    expect(new Set(shapes).size).toBe(TEMPLATES.length);
  });

  it('only ever names a layout that exists for that kind', () => {
    for (const template of TEMPLATES) {
      for (const [kind, layout] of Object.entries(template.layouts)) {
        expect(isLayout(layout), `${template.id}/${kind}=${layout}`).toBe(true);
        expect(
          (LAYOUTS[kind as SectionKind] as readonly string[]).includes(layout as string),
          `${template.id}: ${layout} is not a ${kind} layout`,
        ).toBe(true);
      }
    }
  });

  it('only ever names a real section kind', () => {
    for (const template of TEMPLATES) {
      for (const kind of Object.keys(template.layouts)) {
        expect(SECTION_KINDS).toContain(kind as SectionKind);
      }
    }
  });

  it('gives every template real type, a rhythm and a palette brief', () => {
    for (const template of TEMPLATES) {
      expect(template.shape.fonts.display.length).toBeGreaterThan(3);
      expect(template.shape.fonts.body.length).toBeGreaterThan(3);
      expect(['tight', 'regular', 'airy']).toContain(template.shape.density);
      expect(template.paletteBrief.length).toBeGreaterThan(20);
      expect(template.note.length).toBeGreaterThan(20);
    }
  });

  /** A font named but never loaded renders as a fallback and looks broken. */
  it('loads any web font it names', () => {
    for (const template of TEMPLATES) {
      const href = template.shape.fonts.googleHref;
      if (!href) continue;
      expect(href.startsWith('https://fonts.googleapis.com/')).toBe(true);
      const first = template.shape.fonts.display.match(/"([^"]+)"/)?.[1];
      if (first) expect(href.replace(/\+/g, ' ')).toContain(first);
    }
  });
});

describe('templateById', () => {
  it('finds one, and falls back rather than failing', () => {
    expect(templateById('forge').id).toBe('forge');
    expect(templateById('does-not-exist').id).toBe(DEFAULT_TEMPLATE.id);
    expect(templateById(null).id).toBe(DEFAULT_TEMPLATE.id);
  });
});

describe('templatesFor', () => {
  it('puts the ones made for that trade first', () => {
    expect(templatesFor('restaurant')[0].verticals).toContain('restaurant');
    expect(templatesFor('gym')[0].id).toBe('forge');
  });

  it('always offers every template, so nothing is unreachable', () => {
    expect(templatesFor('clinic')).toHaveLength(TEMPLATES.length);
    expect(templatesFor('nonsense')).toHaveLength(TEMPLATES.length);
  });
});

describe('chooseTemplate', () => {
  it('picks the one made for the trade by default', () => {
    expect(chooseTemplate('restaurant', 'a dhaba in Akola').id).toBe('kiln');
    expect(chooseTemplate('gym', 'a strength gym').id).toBe('forge');
    expect(chooseTemplate('retail', 'a saree shop').verticals).toContain('retail');
  });

  it('lets the brief override the trade when somebody asks for a look', () => {
    expect(chooseTemplate('clinic', 'a high-end luxury cosmetic clinic').id).toBe('estate');
    expect(chooseTemplate('retail', 'a bold energetic streetwear brand').id).toBe('forge');
    expect(chooseTemplate('general', 'an AI startup, futuristic and 3d').id).toBe('circuit');
  });

  /** Pressing "build it again" must not reroll the design. */
  it('is the same every time for the same brief', () => {
    const once = chooseTemplate('salon', 'a calm salon in Pune');
    const twice = chooseTemplate('salon', 'a calm salon in Pune');
    expect(once.id).toBe(twice.id);
  });

  it('always returns something, however odd the brief', () => {
    for (const brief of ['', '   ', '🎉🎉🎉', 'x'.repeat(5000)]) {
      expect(chooseTemplate('nonsense', brief).id.length).toBeGreaterThan(0);
    }
  });
});

describe('coverage across industries', () => {
  it('has a purpose-built template for every vertical that names one', () => {
    // Read from the verticals themselves, so adding a trade without giving it
    // a look shows up here rather than in somebody's finished website.
    const claimed = new Set(TEMPLATES.flatMap((template) => template.verticals));
    for (const slug of claimed) {
      expect(templatesFor(slug)[0].verticals, slug).toContain(slug);
    }
  });
});

describe('the template a shop actually gets', () => {
  /**
   * The bug this ranking exists for. Atelier mentions retail fourth in its
   * list but is declared first in the catalogue, so every shop came out as an
   * editorial boutique — cream paper, a serif headline four lines deep —
   * while Vitrine, whose only trade is retail, sat unused.
   */
  it('gives a shop the template built for shops, not the one that merely mentions them', () => {
    expect(templatesFor('retail')[0].id).toBe('vitrine');
    expect(templatesFor('salon')[0].id).toBe('atelier');
    expect(templatesFor('restaurant')[0].id).toBe('kiln');
    expect(templatesFor('agriculture')[0].id).toBe('harvest');
  });

  it('ranks by how central the trade is to the template', () => {
    // Atelier lists salon first and retail second, so it leads for salons and
    // never for shops.
    const forSalon = templatesFor('salon').map((template) => template.id);
    expect(forSalon.indexOf('atelier')).toBeLessThan(forSalon.indexOf('vitrine'));
  });

  it.each([
    ['fully e-commerce website like Amazon with all categories and add to cart'],
    ['a marketplace selling everything'],
    ['a department store with every category'],
  ])('reads "%s" as a marketplace rather than a boutique', (brief) => {
    expect(chooseTemplate('retail', brief).id).toBe('vitrine');
  });
});

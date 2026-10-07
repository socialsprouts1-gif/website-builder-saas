import { describe, expect, it } from 'vitest';
import { MAX_SCENE_SHOTS, placeShots, shotBriefs } from './scene-shots';
import type { Section } from './kit/sections';

const scene: Section = {
  id: 'scene',
  kind: 'scene3d',
  heading: 'Everything we grow, in a jar',
  subheading: 'Picked on the slope above the farm.',
  body: 'Six preserves, one harvest.',
  items: [
    { title: 'Gelsi Neri', body: 'Black mulberries.' },
    { title: 'Smeraldo', body: 'Pistachio pesto.' },
    { title: 'Cipolla in Agrodolce', body: 'Sweet-and-sour onion.' },
  ],
};

describe('what the scene gets photographed as', () => {
  /**
   * The pictures have to be of the things the section's own words talk about.
   * A scene whose headline says "the brass clasp" and whose photographs are of
   * a generic version of the business is worse than no photographs — it reads
   * as stock, which is the thing generated sites are always accused of.
   */
  it('photographs what the copy actually names', () => {
    const briefs = shotBriefs({ section: scene, business: 'Agrumea Farm', kind: 'farm shop' });
    expect(briefs.map((brief) => brief.subject)).toEqual([
      'Everything we grow, in a jar',
      'Gelsi Neri',
      'Smeraldo',
      'Cipolla in Agrodolce',
    ]);
    for (const brief of briefs) {
      expect(brief.prompt).toContain('Agrumea Farm');
      expect(brief.prompt).toContain(brief.subject);
    }
  });

  /**
   * Transparency is the whole requirement. A product photographed on a white
   * square cannot float in front of anything — it covers it — so a scene made
   * of opaque tiles is a collage however carefully it is arranged.
   */
  it('always asks for a cut-out on transparency', () => {
    for (const brief of shotBriefs({ section: scene, business: 'X', kind: 'shop' })) {
      expect(brief.prompt).toMatch(/transparent background/i);
      expect(brief.prompt).toMatch(/cut out/i);
      // And one lighting setup across the set, or six products read as six
      // cut-outs pasted together.
      expect(brief.prompt).toContain('Key light from the upper left');
      // Nothing that would bake a fake brand into the picture.
      expect(brief.prompt).toMatch(/no text, no logos/i);
    }
  });

  it('never asks for more than the scene can place', () => {
    const many: Section = {
      ...scene,
      items: Array.from({ length: 20 }, (_, index) => ({ title: `Product ${index}` })),
    };
    expect(shotBriefs({ section: many, business: 'X', kind: 'shop' })).toHaveLength(MAX_SCENE_SHOTS);
  });

  it('still photographs something when the section named nothing', () => {
    const bare: Section = { id: 's', kind: 'scene3d' };
    const briefs = shotBriefs({ section: bare, business: 'Agrumea Farm', kind: 'farm shop' });
    expect(briefs).toHaveLength(1);
    expect(briefs[0].prompt).toContain('Agrumea Farm');
  });
});

describe('placing the photographs', () => {
  it('puts each photograph against the thing it was taken of', () => {
    const placed = placeShots(scene, [
      { url: 'https://cdn.test/hero.png', subject: 'Everything we grow, in a jar' },
      { url: 'https://cdn.test/a.png', subject: 'Gelsi Neri' },
      { url: 'https://cdn.test/b.png', subject: 'Smeraldo' },
    ]);
    expect(placed.image).toBe('https://cdn.test/hero.png');
    expect(placed.items?.[0].image).toBe('https://cdn.test/a.png');
    expect(placed.items?.[1].image).toBe('https://cdn.test/b.png');
    // Nothing was made for the third item, and it is left alone rather than
    // given somebody else's picture.
    expect(placed.items?.[2].image).toBeUndefined();
  });

  /**
   * An uploaded photograph of the real product always beats a generated one.
   * This is somebody's actual jar; a model's idea of their jar is a downgrade.
   */
  it('never paints over a picture that was already there', () => {
    const own: Section = {
      ...scene,
      image: 'https://cdn.test/mine.jpg',
      items: [{ title: 'Gelsi Neri', image: 'https://cdn.test/my-jar.jpg' }, { title: 'Smeraldo' }],
    };
    const placed = placeShots(own, [
      { url: 'https://cdn.test/gen-hero.png', subject: 'Everything we grow, in a jar' },
      { url: 'https://cdn.test/gen-b.png', subject: 'Smeraldo' },
    ]);
    expect(placed.image).toBe('https://cdn.test/mine.jpg');
    expect(placed.items?.[0].image).toBe('https://cdn.test/my-jar.jpg');
    // Smeraldo gets the photograph taken of Smeraldo, not the spare hero shot.
    expect(placed.items?.[1].image).toBe('https://cdn.test/gen-b.png');
  });

  /**
   * One shot in the batch failed. Everything after it must not slide onto the
   * wrong product — which is what matching by position did.
   */
  it('keeps the right picture on the right product when one shot failed', () => {
    const placed = placeShots(scene, [
      { url: 'https://cdn.test/onion.png', subject: 'Cipolla in Agrodolce' },
      { url: 'https://cdn.test/mulberry.png', subject: 'Gelsi Neri' },
    ]);
    expect(placed.items?.[0].image).toBe('https://cdn.test/mulberry.png');
    expect(placed.items?.[2].image).toBe('https://cdn.test/onion.png');
  });

  it('changes nothing when every photograph failed', () => {
    expect(placeShots(scene, [])).toBe(scene);
  });
});

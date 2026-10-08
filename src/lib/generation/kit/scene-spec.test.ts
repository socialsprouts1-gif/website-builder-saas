import { describe, expect, it } from 'vitest';
import { buildScene, lightingFor, objectFor, worthRendering } from './scene-spec';
import type { Section } from './sections';

const scene = (over: Partial<Parameters<typeof buildScene>[0]> = {}) =>
  buildScene({
    businessName: 'Northlight',
    businessType: 'Jewellery',
    brief: 'Champagne and bone on charcoal',
    accent: '#e8c98a',
    accentSoft: '#15121f',
    sections: 6,
    ...over,
  });

describe('what goes in the scene', () => {
  it('puts the right object in front of the right trade', () => {
    expect(objectFor('Perfume house').model).toBe('bottle');
    expect(objectFor('Jam and preserves').model).toBe('jar');
    expect(objectFor('SaaS product').model).toBe('slab');
    expect(objectFor('Jewellery').model).toBe('ring');
    // Anything unrecognised still gets an object rather than nothing.
    expect(objectFor('Tailor').model).toBeTruthy();
  });

  it('reads the light off the mood', () => {
    expect(lightingFor('dark cinematic game launch')).toBe('neon');
    expect(lightingFor('gallery white, minimal, concrete')).toBe('gallery');
    expect(lightingFor('warm champagne and gold')).toBe('dusk');
    expect(lightingFor('a plumber in Pune')).toBe('studio');
  });

  /**
   * The bug this is built to prevent, and it shipped once: a companion painted
   * with the ink colour is a dark object under dark light, which rendered as a
   * black hole on the page. Nothing in the scene may be the ink.
   */
  it('never paints an object with the ink colour', () => {
    const built = scene({ accentSoft: '#15121f' });
    for (const actor of built.actors) {
      expect(actor.colour.toLowerCase(), actor.id).not.toBe('#15121f');
    }
  });

  /**
   * One object on a screen is a product shot. Three at three distances is a
   * scene, and the companions must actually be behind the hero or they are
   * just clutter at the same depth.
   */
  it('stands the companions behind the hero', () => {
    const built = scene();
    expect(built.actors).toHaveLength(3);
    const hero = built.actors[0];
    const nearestHeroZ = Math.min(...hero.tracks.map((frame) => frame.z ?? 0));
    for (const companion of built.actors.slice(1)) {
      for (const frame of companion.tracks) {
        expect(frame.z ?? 0, companion.id).toBeLessThan(nearestHeroZ);
      }
    }
  });

  /**
   * The path has to cover the whole page. Three poses stretched over a
   * fourteen-section site leaves the entire back half of it motionless.
   */
  it('choreographs every section, not just the first few', () => {
    for (const sections of [3, 6, 14]) {
      const built = scene({ sections });
      for (const actor of built.actors) {
        const last = actor.tracks[actor.tracks.length - 1];
        expect(last.s, `${actor.id} on a ${sections}-section site`).toBeGreaterThanOrEqual(
          sections - 1,
        );
        // And keyframes have to be in order, or the interpolation walks
        // backwards and the object jumps.
        for (let index = 1; index < actor.tracks.length; index += 1) {
          expect(actor.tracks[index].s).toBeGreaterThan(actor.tracks[index - 1].s);
        }
      }
    }
  });

  /** Positions are screen fractions, so they have to stay on the screen. */
  it('keeps every pose inside the viewport', () => {
    const built = scene({ sections: 12 });
    for (const actor of built.actors) {
      for (const frame of actor.tracks) {
        expect(frame.x, actor.id).toBeGreaterThan(-0.2);
        expect(frame.x, actor.id).toBeLessThan(1.2);
        expect(frame.y, actor.id).toBeGreaterThan(-0.2);
        expect(frame.y, actor.id).toBeLessThan(1.2);
      }
    }
  });

  /** A site rebuilt twice is the same site. */
  it('is the same scene for the same business', () => {
    expect(JSON.stringify(scene())).toBe(JSON.stringify(scene()));
    expect(JSON.stringify(scene({ businessName: 'Someone else' }))).not.toBe(
      JSON.stringify(scene()),
    );
  });

  /** 137 kilobytes of renderer for a one-band page is not a trade worth making. */
  it('does not put a renderer on a page too short to need one', () => {
    const band = { id: 'a', kind: 'hero' } as Section;
    expect(worthRendering([band, band])).toBe(false);
    expect(worthRendering([band, band, band])).toBe(true);
  });
});

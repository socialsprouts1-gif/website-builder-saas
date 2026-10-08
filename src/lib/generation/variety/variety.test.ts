import { describe, expect, it } from 'vitest';
import {
  AA,
  ALL_RECIPES,
  ARCHETYPES,
  buildPalette,
  chooseDirection,
  contrast,
  fingerprint,
  FONT_PAIRS,
  oklchToHex,
  rng,
  seedFrom,
  similarity,
  TOO_ALIKE,
  weightsFor,
  type Fingerprint,
} from './index';
import { LAYOUTS } from '../kit/layouts';

describe('the colour maths', () => {
  it('converts OKLCH to a real hex colour', () => {
    expect(oklchToHex(0, 0, 0)).toBe('#000000');
    expect(oklchToHex(1, 0, 0)).toBe('#ffffff');
    for (const hue of [0, 90, 180, 270]) {
      expect(oklchToHex(0.6, 0.12, hue)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  /**
   * The reason this is OKLCH and not HSL. HSL claims yellow and blue have the
   * same lightness at 50%; one is nearly white and the other nearly black. A
   * palette generator built on that ships unreadable sites at some rate, and
   * nobody finds out until a customer's site is live.
   */
  it('keeps lightness meaning the same thing at every hue', () => {
    const lightnesses = [0, 60, 120, 180, 240, 300].map((hue) =>
      contrast(oklchToHex(0.5, 0.1, hue), '#ffffff'),
    );
    const spread = Math.max(...lightnesses) - Math.min(...lightnesses);
    // In HSL the same sweep spans several whole ratio points.
    expect(spread).toBeLessThan(1.2);
  });

  it('agrees with the known WCAG ratios', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrast('#777777', '#ffffff')).toBeGreaterThan(4.4);
  });

  /**
   * The check that makes generated palettes safe to ship. Every recipe, all
   * the way round the hue wheel, both inks, against all three surfaces.
   */
  it('never generates an unreadable palette, at any hue, in any recipe', () => {
    const failures: string[] = [];
    for (let hue = 0; hue < 360; hue += 5) {
      for (const recipe of ALL_RECIPES) {
        const palette = buildPalette(hue, recipe);
        for (const [name, ink] of [
          ['ink', palette.ink],
          ['muted', palette.inkMuted],
        ] as const) {
          for (const [surfaceName, surface] of [
            ['bg', palette.bg],
            ['surface', palette.surface],
            ['alt', palette.surfaceAlt],
          ] as const) {
            const ratio = contrast(ink, surface);
            if (ratio < AA) {
              failures.push(`${recipe} h${hue} ${name}/${surfaceName} ${ratio.toFixed(2)}`);
            }
          }
        }
        // And the text on a button has to be readable too.
        expect(contrast(palette.accentInk, palette.accent), `${recipe} h${hue} accent`).toBeGreaterThanOrEqual(3);
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  });
});

describe('the seeded stream', () => {
  it('is repeatable and spreads out', () => {
    expect([...Array(5)].map(rng(42))).toEqual([...Array(5)].map(rng(42)));
    expect([...Array(5)].map(rng(42))).not.toEqual([...Array(5)].map(rng(43)));

    const draws = [...Array(2000)].map(rng(7));
    expect(Math.min(...draws)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...draws)).toBeLessThan(1);
    // Roughly flat: no decile should be starved or doubled.
    const buckets = new Array(10).fill(0);
    for (const draw of draws) buckets[Math.floor(draw * 10)] += 1;
    expect(Math.min(...buckets)).toBeGreaterThan(120);
    expect(Math.max(...buckets)).toBeLessThan(300);
  });
});

describe('the archetypes', () => {
  it('has twelve distinct directions, each fully specified', () => {
    expect(ARCHETYPES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(ARCHETYPES.map((entry) => entry.id)).size).toBe(ARCHETYPES.length);
    for (const archetype of ARCHETYPES) {
      expect(archetype.fontMoods.length, archetype.id).toBeGreaterThan(0);
      expect(archetype.recipes.length, archetype.id).toBeGreaterThan(0);
      expect(archetype.hues.length, archetype.id).toBeGreaterThan(0);
      expect(archetype.rigs.length, archetype.id).toBeGreaterThan(0);
      // Every mood it asks for has type available.
      expect(FONT_PAIRS.some((pair) => pair.moods.some((mood) => archetype.fontMoods.includes(mood))), archetype.id).toBe(true);
    }
  });

  /**
   * A direction naming a layout the kit cannot draw would silently fall back
   * for that one section — the variety would look designed and not be there.
   */
  it('only names layouts the renderer actually has', () => {
    for (const archetype of ARCHETYPES) {
      for (const [kind, options] of Object.entries(archetype.layouts)) {
        const allowed = LAYOUTS[kind as keyof typeof LAYOUTS] as readonly string[];
        expect(allowed, `${archetype.id} names section "${kind}"`).toBeTruthy();
        for (const option of options as string[]) {
          expect(allowed, `${archetype.id} → ${kind}`).toContain(option);
        }
      }
    }
  });

  it('points every affinity at archetypes that exist', () => {
    const ids = new Set(ARCHETYPES.map((entry) => entry.id));
    for (const trade of ['Perfume house', 'Sneakers', 'Coffee', 'SaaS app', 'Furniture', 'Nothing in particular']) {
      const weights = weightsFor(trade);
      expect(Object.keys(weights).length, trade).toBeGreaterThan(0);
      for (const id of Object.keys(weights)) expect(ids, trade).toContain(id);
    }
  });
});

describe('choosing a direction', () => {
  /**
   * The complaint this whole module answers: five builds of the same product
   * came out as five copies of one site, because the old chooser fell through
   * to `candidates[0]` and a 3D blueprint named its design outright.
   */
  it('gives five builds of the same product five different directions', () => {
    const recent: Fingerprint[] = [];
    const seen: Fingerprint[] = [];

    for (let build = 0; build < 5; build += 1) {
      const direction = chooseDirection({
        seed: 1000 + build,
        businessType: 'Perfume house',
        recent,
      });
      const print = fingerprint(direction);
      seen.push(print);
      recent.unshift(print);
    }

    // No two of the five may read as the same site.
    for (let a = 0; a < seen.length; a += 1) {
      for (let b = a + 1; b < seen.length; b += 1) {
        expect(similarity(seen[a], seen[b]), `builds ${a + 1} and ${b + 1}`).toBeLessThan(TOO_ALIKE);
      }
    }
    // And they really are different things, not one thing re-rolled.
    expect(new Set(seen.map((print) => print.archetype)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(seen.map((print) => print.fonts)).size).toBeGreaterThanOrEqual(3);
  });

  it('fits the direction to the trade', () => {
    // Over many seeds a jeweller should land in its own neighbourhood far more
    // often than anywhere else — weighted, not random.
    const counts = new Map<string, number>();
    for (let seed = 0; seed < 200; seed += 1) {
      const direction = chooseDirection({ seed, businessType: 'Jewellery house' });
      counts.set(direction.archetype.id, (counts.get(direction.archetype.id) ?? 0) + 1);
    }
    const expected = ['editorial-luxury', 'gallery-museum', 'dark-cinematic', 'japanese-minimal'];
    const inside = expected.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
    expect(inside).toBe(200);
    // And the best fit leads without taking everything.
    expect(counts.get('editorial-luxury')!).toBeGreaterThan(counts.get('japanese-minimal') ?? 0);
    expect(counts.get('editorial-luxury')!).toBeLessThan(200);
  });

  it('gives five different trades five fitting directions', () => {
    const picks = ['Perfume house', 'Sneaker brand', 'Coffee roastery', 'SaaS billing app', 'Furniture showroom'].map(
      (trade) => chooseDirection({ seed: seedFrom(trade), businessType: trade }).archetype.id,
    );
    expect(new Set(picks).size).toBeGreaterThanOrEqual(4);
  });

  it('is repeatable: the same build is the same site', () => {
    const once = chooseDirection({ seed: 99, businessType: 'Coffee roastery' });
    const twice = chooseDirection({ seed: 99, businessType: 'Coffee roastery' });
    expect(fingerprint(once)).toEqual(fingerprint(twice));
    expect(once.palette).toEqual(twice.palette);
  });

  /**
   * Somebody with ten sites has covered most of the space. They must still
   * get an eleventh — a slightly familiar site beats no site.
   */
  it('still returns something when everything is taken', () => {
    const recent: Fingerprint[] = [];
    for (let build = 0; build < 10; build += 1) {
      recent.unshift(fingerprint(chooseDirection({ seed: build, businessType: 'Jewellery house' })));
    }
    const eleventh = chooseDirection({ seed: 999, businessType: 'Jewellery house', recent });
    expect(eleventh.archetype).toBeTruthy();
    expect(eleventh.palette.bg).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('can be pinned, for a "keep this direction" button', () => {
    for (let seed = 0; seed < 6; seed += 1) {
      const direction = chooseDirection({ seed, businessType: 'Anything', archetype: 'swiss-brutalist' });
      expect(direction.archetype.id).toBe('swiss-brutalist');
    }
  });
});

describe('telling two sites apart', () => {
  const base: Fingerprint = {
    archetype: 'editorial-luxury',
    fonts: 'fraunces-inter',
    hue: 30,
    recipe: 'paper',
    rig: 'macro',
  };

  it('calls an identical pair identical', () => {
    expect(similarity(base, base)).toBeCloseTo(1, 5);
  });

  it('weights what a person would actually notice', () => {
    // Different archetype AND type is a different site, whatever else matches.
    const far = { ...base, archetype: 'swiss-brutalist', fonts: 'archivo-archivo' };
    expect(similarity(base, far)).toBeLessThan(TOO_ALIKE);

    // Ten degrees of hue is the same colour to a person; it must not rescue a
    // pair that is otherwise the same.
    const nudged = { ...base, hue: 40 };
    expect(similarity(base, nudged)).toBeGreaterThan(TOO_ALIKE);
  });
});

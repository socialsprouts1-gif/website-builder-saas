/**
 * The scene a generated site hands to the 3D runtime.
 *
 * This is the piece that makes the 3D site-wide rather than sectional. One
 * canvas is fixed behind the whole page; the objects on it travel from
 * section to section as you scroll, passing behind some headlines and in
 * front of others. That is the difference between a site with a 3D widget in
 * it and a 3D site, and it is entirely decided here.
 *
 * Written as data and read by `public/lumen3d.js`, which is the same bytes for
 * every site Lumen publishes — so a site carries a few hundred bytes of scene
 * rather than a renderer, and the renderer is cached across every site a
 * visitor has ever seen.
 *
 * Choreography is authored on a continuous section coordinate: `s: 2.5` is
 * halfway through the third section. Positions are screen fractions, so a
 * composition written once holds on a phone and on a 34-inch monitor.
 */

import type { Section } from './sections';

export interface SceneKeyframe {
  s: number;
  x: number;
  y: number;
  z?: number;
  scale?: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

export interface SceneActor {
  id: string;
  model: string;
  material: string;
  colour: string;
  seed: number;
  tracks: SceneKeyframe[];
}

export interface GeneratedScene {
  lighting: 'studio' | 'dusk' | 'gallery' | 'neon';
  intensity: number;
  accent: string;
  accent2: string;
  actors: SceneActor[];
}

/**
 * What a business's hero object actually is.
 *
 * Deliberately a lookup rather than a question for the model: "what shape is a
 * perfume" has one right answer and asking costs a call and sometimes gets
 * "a bottle of elegance". The vertical already knows the trade.
 */
const OBJECT_BY_TRADE: { match: RegExp; model: string; material: string }[] = [
  { match: /perfume|fragrance|attar|scent/i, model: 'bottle', material: 'glass' },
  { match: /jam|honey|preserve|pickle|sauce|spice|masala/i, model: 'jar', material: 'glass' },
  { match: /cosmetic|skin|cream|beauty|salon|serum/i, model: 'tube', material: 'frosted' },
  { match: /coffee|tea|beverage|juice|drink|brew/i, model: 'can', material: 'metal' },
  { match: /jewel|gold|silver|ring|ornament/i, model: 'ring', material: 'chrome' },
  { match: /phone|app|saas|software|tech|device|electronic/i, model: 'slab', material: 'metal' },
  { match: /furniture|interior|decor|home/i, model: 'pebble', material: 'ceramic' },
  { match: /shoe|sneaker|apparel|cloth|fashion|bag|leather/i, model: 'box', material: 'ceramic' },
  { match: /game|studio|agency|creative|art/i, model: 'sculpture', material: 'chrome' },
];

export function objectFor(businessType: string): { model: string; material: string } {
  for (const entry of OBJECT_BY_TRADE) {
    if (entry.match.test(businessType)) return { model: entry.model, material: entry.material };
  }
  return { model: 'orb', material: 'glass' };
}

/**
 * The supporting cast.
 *
 * Two smaller objects behind the hero at different depths, because one object
 * on a screen is a product shot and three at three distances is a scene. They
 * are deliberately not the product: a ring and a pebble read as composition,
 * three copies of the same bottle read as a catalogue.
 */
const COMPANIONS: { model: string; material: string }[] = [
  { model: 'ring', material: 'metal' },
  { model: 'pebble', material: 'ceramic' },
  { model: 'orb', material: 'chrome' },
];

/** Repeatable from a string, so a site rebuilt twice is the same site. */
function seedFrom(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash % 100_000);
}

/**
 * A path across the whole page.
 *
 * The hero crosses the viewport rather than sitting in the middle of it: left
 * of the headline, then behind it, then right and forward, then away. Every
 * leg is a deliberate composition against the section it lands on, which is
 * what the keyframes in the reference site are doing and why it reads as
 * directed rather than decorative.
 */
function heroTrack(sections: number, seed: number): SceneKeyframe[] {
  const sway = (seed % 7) / 100;
  const last = Math.max(sections - 1, 1);

  const frames: SceneKeyframe[] = [
    { s: 0, x: 0.62 + sway, y: 0.52, z: 0, scale: 1.0, ry: 0.02 },
    { s: 1, x: 0.28 - sway, y: 0.46, z: -1.6, scale: 0.95, ry: 0.22 },
    { s: 2, x: 0.74, y: 0.58, z: 0.4, scale: 1.1, ry: 0.46 },
  ];

  // Longer sites get more of the path rather than the same three poses
  // stretched over them, which would leave the whole back half still.
  for (let index = 3; index <= last; index += 1) {
    const side = index % 2 === 0 ? 0.7 : 0.3;
    frames.push({
      s: index,
      x: side + (index % 3 === 0 ? sway : -sway),
      y: 0.4 + ((index * 13) % 25) / 100,
      z: index % 3 === 0 ? -2.2 : 0.4,
      scale: index % 3 === 0 ? 0.8 : 1.15,
      ry: 0.46 + index * 0.18,
    });
  }

  return frames;
}

function companionTrack(sections: number, offset: number, seed: number): SceneKeyframe[] {
  const last = Math.max(sections - 1, 1);
  const frames: SceneKeyframe[] = [];
  for (let index = 0; index <= last; index += 1) {
    const swing = Math.sin((index + offset) * 1.1 + seed / 1000);
    frames.push({
      s: index,
      x: 0.5 + swing * 0.42,
      y: 0.34 + ((index * 17 + offset * 29) % 40) / 100,
      // Always behind the hero, so they read as distance rather than clutter.
      z: -2.4 - offset * 1.3,
      scale: 0.5 - offset * 0.08,
      rx: index * 0.08,
      ry: index * 0.14,
    });
  }
  return frames;
}

const LIGHTING_BY_MOOD: { match: RegExp; lighting: GeneratedScene['lighting'] }[] = [
  { match: /dark|night|cinema|game|bold|neon|violet|magenta/i, lighting: 'neon' },
  { match: /gallery|minimal|white|museum|clean|concrete/i, lighting: 'gallery' },
  { match: /warm|dusk|amber|gold|champagne|terracotta|clay/i, lighting: 'dusk' },
];

export function lightingFor(brief: string): GeneratedScene['lighting'] {
  for (const entry of LIGHTING_BY_MOOD) {
    if (entry.match.test(brief)) return entry.lighting;
  }
  return 'studio';
}

/**
 * The whole scene for one site.
 *
 * `sections` is how many bands the page has, which sets how long the path is.
 * Everything else comes off the business and the palette, so two sites with
 * different trades and different accents get different objects on different
 * paths under different light.
 */
export function buildScene(params: {
  businessName: string;
  businessType: string;
  brief: string;
  accent: string;
  accentSoft: string;
  sections: number;
}): GeneratedScene {
  const seed = seedFrom(`${params.businessName}:${params.businessType}`);
  const hero = objectFor(params.businessType);

  const actors: SceneActor[] = [
    {
      id: 'hero',
      model: hero.model,
      material: hero.material,
      colour: params.accent,
      seed,
      tracks: heroTrack(params.sections, seed),
    },
  ];

  // Two companions, chosen by the seed so the same business always gets the
  // same pair and a different business usually gets a different one.
  for (let index = 0; index < 2; index += 1) {
    const choice = COMPANIONS[(seed + index * 3) % COMPANIONS.length];
    actors.push({
      id: `near${index}`,
      model: choice.model,
      material: choice.material,
      // Never the ink colour. A dark metal ring under a dark environment is a
      // black hole on the page — which is exactly what the first build drew.
      // A companion is either the accent or a bright neutral, nothing else.
      colour: index === 0 ? '#d8d8e0' : params.accent,
      seed: seed + index * 977,
      tracks: companionTrack(params.sections, index + 1, seed),
    });
  }

  return {
    lighting: lightingFor(`${params.brief} ${params.accent}`),
    intensity: 0.65,
    accent: params.accent,
    accent2: params.accentSoft,
    actors,
  };
}

/**
 * Whether this site is worth putting a renderer on the page for.
 *
 * A 3D site with one band is a product shot, and 137 kilobytes of renderer for
 * one band is not a trade worth making.
 */
export function worthRendering(sections: Section[]): boolean {
  return sections.length >= 3;
}

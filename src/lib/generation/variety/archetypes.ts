/**
 * The twelve directions a site can be taken in.
 *
 * An archetype is not a colour scheme. It is a bundle of decisions that
 * normally travel together — type, how saturated the palette is, how much the
 * page moves, what the 3D light is doing, which layout each section takes —
 * and bundling them is what stops "variety" producing a brutalist headline
 * over a wellness palette with a cinematic scene behind it.
 *
 * This is the fix for "it generates the same website every time", and the
 * reason it was happening is one line in the old code: `chooseTemplate` fell
 * through to `candidates[0]`, and a 3D blueprint named its design outright.
 * So every 3D portfolio was the same template, the same type and the same
 * palette brief, for ever, and only the words changed.
 */

import type { SectionKind } from '../kit/sections';
import type { FontMood } from './fonts';
import type { RecipeName } from './colour';

export type SceneRig =
  | 'floating'
  | 'turntable'
  | 'exploded'
  | 'orbit'
  | 'pinned'
  | 'rail'
  | 'macro'
  | 'assembly';

export interface Archetype {
  id: string;
  label: string;
  /** What it feels like, in words a person would use. */
  note: string;
  fontMoods: FontMood[];
  /** The palette recipes this direction is drawn with. */
  recipes: RecipeName[];
  /** Hue ranges it lives in, as [from, to] degrees. */
  hues: [number, number][];
  motion: 'subtle' | 'lively';
  depth: 'flat' | 'raised' | 'dimensional';
  lighting: 'studio' | 'dusk' | 'gallery' | 'neon';
  rigs: SceneRig[];
  /** Which layout each section tends to take. Not every kind needs an opinion. */
  layouts: Partial<Record<SectionKind, string[]>>;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'editorial-luxury',
    label: 'Editorial luxury',
    note: 'Big quiet serif, a lot of paper, one accent that never raises its voice.',
    fontMoods: ['editorial', 'luxury'],
    recipes: ['paper', 'gallery', 'sand'],
    hues: [[20, 50], [330, 360]],
    motion: 'subtle',
    depth: 'raised',
    lighting: 'gallery',
    rigs: ['macro', 'turntable', 'floating'],
    layouts: {
      hero: ['editorial', 'centre'],
      features: ['checks', 'cards'],
      gallery: ['mosaic', 'stack'],
      about: ['statement', 'offset'],
      cta: ['panel'],
    },
  },
  {
    id: 'swiss-brutalist',
    label: 'Swiss brutalist',
    note: 'Enormous type, hard grid, almost no colour, nothing decorative.',
    fontMoods: ['brutal', 'grotesk'],
    recipes: ['gallery', 'slate'],
    hues: [[0, 20], [200, 260]],
    motion: 'subtle',
    depth: 'flat',
    lighting: 'gallery',
    rigs: ['pinned', 'rail'],
    layouts: {
      hero: ['editorial'],
      features: ['numbered', 'bento'],
      services: ['index', 'numbered'],
      gallery: ['grid'],
      cta: ['full'],
    },
  },
  {
    id: 'organic-wellness',
    label: 'Organic wellness',
    note: 'Warm neutrals, soft corners, photography of real things.',
    fontMoods: ['organic', 'classical'],
    recipes: ['sand', 'paper'],
    hues: [[60, 140]],
    motion: 'subtle',
    depth: 'raised',
    lighting: 'studio',
    rigs: ['floating', 'macro'],
    layouts: {
      hero: ['split', 'showcase'],
      features: ['cards'],
      gallery: ['mosaic'],
      steps: ['timeline'],
      cta: ['panel'],
    },
  },
  {
    id: 'kinetic-sport',
    label: 'Kinetic sport',
    note: 'Fast, loud, diagonal. Everything arrives from somewhere.',
    fontMoods: ['brutal', 'grotesk', 'technical'],
    recipes: ['duotone', 'saturated'],
    hues: [[10, 40], [100, 150]],
    motion: 'lively',
    depth: 'dimensional',
    lighting: 'neon',
    rigs: ['assembly', 'orbit', 'rail'],
    layouts: {
      hero: ['fullbleed', 'editorial'],
      features: ['ticker', 'bento'],
      stats: ['band'],
      gallery: ['rail'],
      cta: ['full'],
    },
  },
  {
    id: 'retro-chrome',
    label: 'Retro-futurist chrome',
    note: 'Mirror finishes, deep gradients, type that looks machined.',
    fontMoods: ['technical', 'playful'],
    recipes: ['midnight', 'duotone'],
    hues: [[240, 300]],
    motion: 'lively',
    depth: 'dimensional',
    lighting: 'neon',
    rigs: ['turntable', 'orbit', 'exploded'],
    layouts: {
      hero: ['showcase', 'centre'],
      features: ['bento'],
      gallery: ['rail'],
      testimonials: ['ticker'],
      cta: ['full'],
    },
  },
  {
    id: 'japanese-minimal',
    label: 'Japanese minimal',
    note: 'Space as the subject. Small type, wide margins, one thing at a time.',
    fontMoods: ['classical', 'grotesk'],
    recipes: ['gallery', 'sand'],
    hues: [[0, 30], [180, 220]],
    motion: 'subtle',
    depth: 'flat',
    lighting: 'gallery',
    rigs: ['macro', 'floating'],
    layouts: {
      hero: ['centre'],
      about: ['statement'],
      features: ['checks'],
      gallery: ['stack'],
      cta: ['band'],
    },
  },
  {
    id: 'gallery-museum',
    label: 'Gallery',
    note: 'Work hung on a white wall, lit, approached rather than scrolled.',
    fontMoods: ['editorial', 'classical'],
    recipes: ['gallery'],
    hues: [[0, 360]],
    motion: 'subtle',
    depth: 'raised',
    lighting: 'gallery',
    rigs: ['pinned', 'macro', 'rail'],
    layouts: {
      hero: ['editorial', 'centre'],
      gallery: ['mosaic', 'grid'],
      about: ['offset'],
      features: ['checks'],
      cta: ['band'],
    },
  },
  {
    id: 'y2k-playful',
    label: 'Y2K playful',
    note: 'Bright, round, a bit silly. Gradients and bubbles.',
    fontMoods: ['playful'],
    recipes: ['saturated', 'duotone'],
    hues: [[280, 340], [180, 220]],
    motion: 'lively',
    depth: 'dimensional',
    lighting: 'neon',
    rigs: ['orbit', 'floating', 'assembly'],
    layouts: {
      hero: ['centre', 'showcase'],
      features: ['bento', 'ticker'],
      gallery: ['feed'],
      testimonials: ['ticker'],
      cta: ['panel'],
    },
  },
  {
    id: 'industrial-tech',
    label: 'Industrial tech',
    note: 'Graphite, measurement, monospace numbers. Built rather than designed.',
    fontMoods: ['technical', 'grotesk'],
    recipes: ['slate', 'midnight'],
    hues: [[190, 230]],
    motion: 'subtle',
    depth: 'dimensional',
    lighting: 'studio',
    rigs: ['exploded', 'turntable', 'pinned'],
    layouts: {
      hero: ['split'],
      features: ['bento', 'numbered'],
      stats: ['cards'],
      steps: ['timeline'],
      pricing: ['table'],
      cta: ['full'],
    },
  },
  {
    id: 'mediterranean-warm',
    label: 'Mediterranean',
    note: 'Terracotta, lime plaster, sun. Hand-made rather than manufactured.',
    fontMoods: ['organic', 'editorial'],
    recipes: ['sand', 'paper'],
    hues: [[20, 60]],
    motion: 'subtle',
    depth: 'raised',
    lighting: 'dusk',
    rigs: ['floating', 'macro'],
    layouts: {
      hero: ['split', 'fullbleed'],
      gallery: ['mosaic'],
      features: ['cards'],
      about: ['offset'],
      cta: ['panel'],
    },
  },
  {
    id: 'dark-cinematic',
    label: 'Dark cinematic',
    note: 'Near-black, one light source, everything slow and deliberate.',
    fontMoods: ['editorial', 'grotesk'],
    recipes: ['midnight', 'slate'],
    hues: [[220, 280], [0, 20]],
    motion: 'lively',
    depth: 'dimensional',
    lighting: 'dusk',
    rigs: ['pinned', 'turntable', 'macro'],
    layouts: {
      hero: ['fullbleed', 'editorial'],
      about: ['statement'],
      features: ['checks'],
      gallery: ['stack'],
      cta: ['full'],
    },
  },
  {
    id: 'pastel-soft',
    label: 'Pastel soft-3D',
    note: 'Clay colours, rounded everything, soft shadows. Friendly.',
    fontMoods: ['playful', 'grotesk'],
    recipes: ['sand', 'gallery'],
    hues: [[300, 360], [140, 190]],
    motion: 'subtle',
    depth: 'raised',
    lighting: 'studio',
    rigs: ['floating', 'orbit'],
    layouts: {
      hero: ['centre', 'split'],
      features: ['cards', 'bento'],
      steps: ['cards'],
      gallery: ['grid'],
      cta: ['panel'],
    },
  },
];

export const archetypeById = (id: string): Archetype | undefined =>
  ARCHETYPES.find((entry) => entry.id === id);

/**
 * Which directions suit which trade, and how strongly.
 *
 * Weights rather than one answer, because always picking the best fit is how
 * every perfume site ends up identical. A jeweller is usually editorial
 * luxury and sometimes a gallery and occasionally dark cinematic — all three
 * are right, and the third is the one that makes somebody's site memorable.
 */
export const AFFINITY: { match: RegExp; weights: Record<string, number> }[] = [
  {
    match: /perfume|fragrance|jewel|luxur|boutique|couture|watch/i,
    weights: { 'editorial-luxury': 5, 'gallery-museum': 3, 'dark-cinematic': 2, 'japanese-minimal': 2 },
  },
  {
    match: /shoe|sneaker|sport|fitness|gym|athlet/i,
    weights: { 'kinetic-sport': 5, 'y2k-playful': 3, 'swiss-brutalist': 2, 'industrial-tech': 1 },
  },
  {
    match: /coffee|tea|bakery|restaurant|cafe|food|farm|organic|juice/i,
    weights: { 'mediterranean-warm': 5, 'organic-wellness': 4, 'editorial-luxury': 2 },
  },
  {
    match: /saas|software|app|tech|ai|developer|api|data|device|electronic/i,
    weights: { 'industrial-tech': 5, 'retro-chrome': 3, 'swiss-brutalist': 2, 'dark-cinematic': 2 },
  },
  {
    match: /game|studio|entertainment|music|film|media/i,
    weights: { 'dark-cinematic': 5, 'retro-chrome': 3, 'y2k-playful': 3, 'kinetic-sport': 2 },
  },
  {
    match: /furniture|interior|architect|property|real estate|decor/i,
    weights: { 'japanese-minimal': 5, 'gallery-museum': 3, 'editorial-luxury': 2, 'mediterranean-warm': 2 },
  },
  {
    match: /salon|spa|beauty|skin|wellness|yoga|clinic|dental|health/i,
    weights: { 'organic-wellness': 5, 'pastel-soft': 3, 'japanese-minimal': 2 },
  },
  {
    match: /photograph|portfolio|design|art|illustrat|creative|agency/i,
    weights: { 'gallery-museum': 4, 'swiss-brutalist': 3, 'editorial-luxury': 3, 'dark-cinematic': 2 },
  },
  {
    match: /school|coaching|education|course|tuition|academy/i,
    weights: { 'pastel-soft': 4, 'organic-wellness': 3, 'industrial-tech': 2, 'swiss-brutalist': 2 },
  },
  {
    match: /law|legal|finance|account|insurance|consult/i,
    weights: { 'swiss-brutalist': 4, 'japanese-minimal': 3, 'industrial-tech': 3, 'editorial-luxury': 2 },
  },
];

/** Everything, weighted evenly — for a trade nothing matches. */
export function weightsFor(businessType: string): Record<string, number> {
  for (const entry of AFFINITY) {
    if (entry.match.test(businessType)) return entry.weights;
  }
  return Object.fromEntries(ARCHETYPES.map((entry) => [entry.id, 1]));
}

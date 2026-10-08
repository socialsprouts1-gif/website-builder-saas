/**
 * Picking a direction, and not picking the same one twice.
 *
 * Variety has to be designed, not hoped for. Three mechanisms, and all three
 * are needed — any two of them still produce a recognisable house style:
 *
 *   weighted choice — the best-fitting archetype is the most likely, never
 *     the certain one. Always taking the top match is exactly how every
 *     perfume site came out identical.
 *   a seed — so a build is repeatable. The same site rebuilt is the same
 *     site; a different site is a different roll.
 *   a memory — a fingerprint of what this account has already been given, so
 *     the next one is rejected if it is too close. Without it, chance alone
 *     hands somebody the same direction twice in five, which is precisely
 *     when they notice.
 */

import { layoutFor } from '../kit/layouts';
import type { SectionKind } from '../kit/sections';
import { ARCHETYPES, archetypeById, weightsFor, type Archetype, type SceneRig } from './archetypes';
import { FONT_PAIRS, fontsForMood, type FontPair } from './fonts';
import { buildPalette, hueDistance, RECIPES, type Palette, type RecipeName } from './colour';

export * from './archetypes';
export * from './colour';
export * from './fonts';

/** A repeatable stream from one seed. Mulberry32 — short, and good enough. */
export function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function seedFrom(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** One weighted draw. */
function pickWeighted<T extends string>(weights: Record<T, number>, roll: number): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return entries[0][0];

  let cursor = roll * total;
  for (const [key, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function pick<T>(items: readonly T[], roll: number): T {
  return items[Math.min(items.length - 1, Math.floor(roll * items.length))];
}

export interface Direction {
  seed: number;
  archetype: Archetype;
  fonts: FontPair;
  palette: Palette;
  hue: number;
  recipe: RecipeName;
  rig: SceneRig;
  /** The layout each section takes, where this direction has an opinion. */
  layouts: Partial<Record<SectionKind, string>>;
}

/**
 * A fingerprint, for deciding whether two sites look alike.
 *
 * Only the things somebody would actually notice. Comparing whole specs would
 * make every build unique on some field nobody can see, and the rejection
 * would never fire.
 */
export interface Fingerprint {
  archetype: string;
  fonts: string;
  hue: number;
  recipe: string;
  rig: string;
}

export function fingerprint(direction: Direction): Fingerprint {
  return {
    archetype: direction.archetype.id,
    fonts: direction.fonts.id,
    hue: direction.hue,
    recipe: direction.recipe,
    rig: direction.rig,
  };
}

/**
 * How alike two directions are, 0 to 1.
 *
 * Weighted by what carries a look. The archetype is most of it, type is the
 * next loudest thing on a page, and hue is a gradient rather than a match —
 * two sites 10 degrees apart are the same colour to a person, and 120 degrees
 * apart are not.
 */
export function similarity(first: Fingerprint, second: Fingerprint): number {
  const same = (a: string, b: string) => (a === b ? 1 : 0);
  const hueScore = 1 - Math.min(hueDistance(first.hue, second.hue), 90) / 90;

  return (
    same(first.archetype, second.archetype) * 0.4 +
    same(first.fonts, second.fonts) * 0.25 +
    hueScore * 0.2 +
    same(first.recipe, second.recipe) * 0.1 +
    same(first.rig, second.rig) * 0.05
  );
}

/** Above this and it reads as the same site. */
export const TOO_ALIKE = 0.6;

function draw(seed: number, businessType: string, forceArchetype?: string): Direction {
  const random = rng(seed);

  const archetype =
    (forceArchetype ? archetypeById(forceArchetype) : undefined) ??
    archetypeById(pickWeighted(weightsFor(businessType), random())) ??
    ARCHETYPES[0];

  const pool = fontsForMood(archetype.fontMoods);
  const fonts = pick(pool, random());

  const recipe = pick(archetype.recipes, random()) as RecipeName;
  const [from, to] = pick(archetype.hues, random());
  const hue = Math.round(from + random() * (to - from));

  const rig = pick(archetype.rigs, random());

  // Each section takes one of the layouts this direction allows, validated
  // against what the renderer can actually draw — a direction naming a layout
  // the kit does not have would silently fall back for that one section and
  // quietly undo the variety.
  const layouts: Partial<Record<SectionKind, string>> = {};
  for (const [kind, options] of Object.entries(archetype.layouts)) {
    const wanted = pick(options as string[], random());
    layouts[kind as SectionKind] = layoutFor(kind as SectionKind, wanted);
  }

  return {
    seed,
    archetype,
    fonts,
    palette: buildPalette(hue, recipe),
    hue,
    recipe,
    rig,
    layouts,
  };
}

export interface DirectionRequest {
  /** Anything stable about this build — the business, the brief, the time. */
  seed: number;
  businessType: string;
  /** What this account has already been given, newest first. */
  recent?: Fingerprint[];
  /** Pins the archetype, for a "change the direction" button. */
  archetype?: string;
}

/**
 * The direction this build is made in.
 *
 * Re-rolled until it is far enough from everything this account already has,
 * then given up on after a bounded number of tries — a user with ten sites
 * covering most of the space must still get an eleventh, and a slightly
 * familiar site is better than no site.
 */
export function chooseDirection(request: DirectionRequest): Direction {
  const recent = request.recent ?? [];
  let best: Direction | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    // A different stream per attempt, not the next number from one stream:
    // re-rolling one sequence correlates the attempts.
    const candidate = draw(seedFrom(`${request.seed}:${attempt}`), request.businessType, request.archetype);
    if (recent.length === 0) return candidate;

    const print = fingerprint(candidate);
    const worst = Math.max(...recent.slice(0, 10).map((entry) => similarity(print, entry)));
    if (worst < TOO_ALIKE) return candidate;

    // Keep the least-alike of the rejects, so giving up still gives up on the
    // best of what was seen rather than on the last thing rolled.
    if (worst < bestScore) {
      bestScore = worst;
      best = candidate;
    }
  }

  return best ?? draw(request.seed, request.businessType, request.archetype);
}

/** Every direction, for an admin screen or a "shuffle" that shows the options. */
export const DIRECTIONS = ARCHETYPES;
export const ALL_FONTS = FONT_PAIRS;
export const ALL_RECIPES = Object.keys(RECIPES) as RecipeName[];

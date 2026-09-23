import { DEFAULT_TEMPLATE, templateById, type Template } from '@/lib/generation/kit/templates';
import { DEFAULT_VERTICAL, verticalBySlug, type Vertical } from '@/lib/generation/verticals';
import { HOSPITALITY_BLUEPRINTS } from './blueprints/hospitality';
import { CARE_BLUEPRINTS } from './blueprints/care';
import { PROPERTY_BLUEPRINTS } from './blueprints/property';
import { COMMERCE_BLUEPRINTS } from './blueprints/commerce';
import { KNOWLEDGE_BLUEPRINTS } from './blueprints/knowledge';
import { TEMPLATE_INDUSTRIES } from './industries';
import { sectionCount, type Blueprint, type BlueprintFeature, type BlueprintStyle } from './types';

export * from './types';
export * from './industries';

export const BLUEPRINTS: Blueprint[] = [
  ...CARE_BLUEPRINTS,
  ...HOSPITALITY_BLUEPRINTS,
  ...COMMERCE_BLUEPRINTS,
  ...PROPERTY_BLUEPRINTS,
  ...KNOWLEDGE_BLUEPRINTS,
];

export const blueprintById = (id: string | null | undefined): Blueprint | undefined =>
  id ? BLUEPRINTS.find((blueprint) => blueprint.id === id) : undefined;

/**
 * The design system this blueprint is drawn with.
 *
 * Composed rather than stored: the design template carries the type, the
 * rhythm, the motion and the depth, and the blueprint overrides only what it
 * needs its own version of. That is what keeps a new blueprint to a paragraph
 * instead of forty lines of tokens that nobody will keep in step.
 */
export function blueprintDesign(blueprint: Blueprint): Template {
  const base = templateById(blueprint.design);
  return {
    ...base,
    id: blueprint.id,
    name: blueprint.name,
    note: blueprint.note,
    shape: { ...base.shape, ...blueprint.shape },
    motion: blueprint.motion ?? base.motion,
    depth: blueprint.depth ?? base.depth,
    paletteBrief: blueprint.paletteBrief ?? base.paletteBrief,
    layouts: { ...base.layouts, ...blueprint.layouts },
  };
}

/** Tone, the action that matters, and whether this business sells things. */
export function blueprintVertical(blueprint: Blueprint): Vertical {
  const vertical = verticalBySlug(blueprint.vertical) ?? DEFAULT_VERTICAL;
  // The blueprint's own pages replace the vertical's — that is the whole point
  // of a blueprint — and its action is the one on the card somebody chose.
  return { ...vertical, action: blueprint.action, pages: blueprint.pages };
}

export const blueprintSellsThings = (blueprint: Blueprint): boolean =>
  blueprint.features.includes('shop');

export interface BlueprintFilters {
  industry?: string | null;
  style?: BlueprintStyle | null;
  feature?: BlueprintFeature | null;
  /** Free text, matched against name, business types, industry and style. */
  query?: string | null;
}

/**
 * The library's search.
 *
 * Deliberately forgiving and deliberately dumb: somebody typing "dentist" is
 * looking for the dental templates, and a scoring model that returns the
 * wedding one third would be worse than useless. Substring matching across the
 * fields a person would actually type.
 */
export function filterBlueprints(filters: BlueprintFilters): Blueprint[] {
  const query = filters.query?.trim().toLowerCase() ?? '';

  return BLUEPRINTS.filter((blueprint) => {
    if (filters.industry && blueprint.industry !== filters.industry) return false;
    if (filters.style && blueprint.style !== filters.style) return false;
    if (filters.feature && !blueprint.features.includes(filters.feature)) return false;
    if (!query) return true;

    const industry = TEMPLATE_INDUSTRIES.find((entry) => entry.slug === blueprint.industry);
    const haystack = [
      blueprint.name,
      blueprint.note,
      blueprint.style,
      blueprint.action,
      ...blueprint.businessTypes,
      ...blueprint.features,
      industry?.label ?? '',
      ...(industry?.examples ?? []),
      ...(industry?.match ?? []),
    ]
      .join(' ')
      .toLowerCase();

    return query.split(/\s+/).every((word) => haystack.includes(word));
  });
}

/**
 * Which industry a sentence is about.
 *
 * Whole words only, and a strong word always beats a weak one. Both rules come
 * from the same two failures: "entirely" contained "ent" and became a clinic,
 * and "gym with classes" became a coaching centre because "classes" is the
 * longer word. Returns null rather than guessing — an unrecognised business
 * should be offered a choice, not filed wrongly.
 */
export function detectIndustry(text: string): string | null {
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const haystack = ` ${words.join(' ')} `;
  const hits = (term: string) => haystack.includes(` ${term.toLowerCase()} `);

  let strong: { slug: string; length: number } | null = null;
  let weak: { slug: string; length: number } | null = null;

  for (const industry of TEMPLATE_INDUSTRIES) {
    for (const term of industry.match) {
      if (!hits(term)) continue;
      if (!strong || term.length > strong.length) strong = { slug: industry.slug, length: term.length };
    }
    for (const term of industry.weak ?? []) {
      if (!hits(term)) continue;
      if (!weak || term.length > weak.length) weak = { slug: industry.slug, length: term.length };
    }
  }

  return strong?.slug ?? weak?.slug ?? null;
}

/**
 * The three templates to put in front of somebody who typed a sentence.
 *
 * Three, always: one is a decision made for them, and more than three is a
 * catalogue. When nothing matches they get a spread across industries rather
 * than three variations of a guess.
 */
export function recommendBlueprints(text: string, count = 3): Blueprint[] {
  const industry = detectIndustry(text);
  const matched = industry ? BLUEPRINTS.filter((blueprint) => blueprint.industry === industry) : [];
  if (matched.length >= count) return matched.slice(0, count);

  const rest = BLUEPRINTS.filter((blueprint) => !matched.includes(blueprint));
  const spread: Blueprint[] = [];
  const seen = new Set<string>(matched.map((blueprint) => blueprint.industry));
  for (const blueprint of rest) {
    if (seen.has(blueprint.industry)) continue;
    seen.add(blueprint.industry);
    spread.push(blueprint);
    if (matched.length + spread.length >= count) break;
  }
  return [...matched, ...spread].slice(0, count);
}

/** What the card prints, without the card having to know how to count. */
export interface BlueprintCard {
  id: string;
  name: string;
  industryLabel: string;
  businessTypes: string[];
  style: BlueprintStyle;
  note: string;
  sections: number;
  pages: number;
  features: BlueprintFeature[];
}

export function blueprintCard(blueprint: Blueprint): BlueprintCard {
  const industry = TEMPLATE_INDUSTRIES.find((entry) => entry.slug === blueprint.industry);
  return {
    id: blueprint.id,
    name: blueprint.name,
    industryLabel: industry?.label ?? blueprint.industry,
    businessTypes: blueprint.businessTypes,
    style: blueprint.style,
    note: blueprint.note,
    sections: sectionCount(blueprint),
    // A hidden page is a basket or a checkout. Nobody browses to one, so it is
    // not a page in the sense the card means.
    pages: blueprint.pages.filter((page) => !page.hidden).length,
    features: blueprint.features,
  };
}

export const DEFAULT_DESIGN = DEFAULT_TEMPLATE;

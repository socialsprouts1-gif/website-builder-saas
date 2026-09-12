import { isSectionKind, type Section, type SectionItem, type SectionKind } from './sections';

/**
 * Reading a model's JSON into a section.
 *
 * Everything is clamped and typed here. Content goes straight into someone's
 * published website, so a missing key must produce a shorter section rather
 * than "undefined" on a live page, and an enormous reply must not produce a
 * page nobody can scroll.
 */

const MAX_ITEMS = 12;
const LIMITS = { heading: 140, subheading: 300, body: 1200, item: 400, label: 60 } as const;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  // Models occasionally return markdown despite being told not to.
  const cleaned = value.replace(/\s+/g, ' ').replace(/^[*#>\s-]+/, '').trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
}

function cta(value: unknown): { label: string; href: string } | undefined {
  const source = (value ?? {}) as Record<string, unknown>;
  const label = text(source.label, LIMITS.label);
  if (!label) return undefined;
  return { label, href: typeof source.href === 'string' ? source.href : '#' };
}

function items(value: unknown): SectionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_ITEMS)
    .map((raw) => {
      const source = (raw ?? {}) as Record<string, unknown>;
      const item: SectionItem = {
        title: text(source.title, LIMITS.label * 2),
        body: text(source.body, LIMITS.item),
        meta: text(source.meta, LIMITS.label),
        href: typeof source.href === 'string' ? source.href : undefined,
      };
      return item;
    })
    .filter((item) => Boolean(item.title || item.body));
}

export function parseSection(kind: SectionKind, id: string, raw: unknown): Section {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    id,
    kind,
    eyebrow: text(source.eyebrow, LIMITS.label),
    heading: text(source.heading, LIMITS.heading),
    subheading: text(source.subheading, LIMITS.subheading),
    body: text(source.body, LIMITS.body),
    items: items(source.items),
    primaryCta: cta(source.primaryCta),
    secondaryCta: cta(source.secondaryCta),
  };
}

/** A section with nothing in it is dropped rather than rendered empty. */
export function hasContent(section: Section): boolean {
  if (section.kind === 'contact') return true;
  return Boolean(section.heading || section.body || (section.items?.length ?? 0) > 0);
}

export function sectionKindsFrom(value: unknown, fallback: SectionKind[]): SectionKind[] {
  if (!Array.isArray(value)) return fallback;
  const kinds = value.filter(isSectionKind);
  return kinds.length > 0 ? kinds.slice(0, 8) : fallback;
}

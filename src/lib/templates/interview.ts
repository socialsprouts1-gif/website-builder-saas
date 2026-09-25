import type { InterviewTemplate } from '@/lib/generation/interview';
import type { SectionKind } from '@/lib/generation/kit/sections';
import { blueprintCard, blueprintSellsThings } from './index';
import type { Blueprint } from './types';

/**
 * A chosen template, turned into the questions worth asking about it.
 *
 * The form this replaced asked every business the same fourteen things, in the
 * same order, whether or not the template had anywhere to put the answer. A
 * blueprint already says what its pages contain, so it already says what only
 * the owner can supply: a prices band needs prices, a team band needs names, an
 * FAQ needs the questions customers actually ask. This is that translation —
 * section kinds, which are Lumen's vocabulary, into things a shop owner can
 * answer without knowing any of it.
 *
 * Sections with nothing to ask about are absent on purpose. A hero writes
 * itself from the business name; asking about it would spend one of nine
 * questions on something the generator never needed.
 */
const NEEDS: Partial<Record<SectionKind, string>> = {
  services: 'what they offer, one by one',
  pricing: 'prices',
  menu: 'a menu or price list',
  team: 'the people who work there',
  gallery: 'photographs of the place or the work',
  beforeafter: 'before-and-after photographs',
  testimonials: 'what customers say about them',
  stats: 'numbers worth showing — years open, people served',
  logos: 'brands, certifications or partners worth naming',
  steps: 'how the work actually happens, step by step',
  faq: 'the questions customers keep asking',
  hours: 'opening hours',
  contact: 'how people reach them — phone, address, email',
  about: 'how the business started and who runs it',
};

export function blueprintInterview(blueprint: Blueprint): InterviewTemplate {
  const card = blueprintCard(blueprint);

  // A basket and a checkout are pages nobody browses to. Naming them would
  // describe the site wrongly to the one reader who decides what to ask.
  const pages = blueprint.pages.filter((page) => !page.hidden);

  const needs = new Set<string>();
  for (const page of pages) {
    for (const section of page.sections) {
      const need = NEEDS[section];
      if (need) needs.add(need);
    }
  }

  return {
    name: blueprint.name,
    industry: card.industryLabel,
    businessTypes: blueprint.businessTypes,
    action: blueprint.action,
    pages: pages.map((page) => page.title),
    needs: [...needs],
    sells: blueprintSellsThings(blueprint),
  };
}

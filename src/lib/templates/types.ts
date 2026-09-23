import type { SectionKind } from '@/lib/generation/kit/sections';
import type { Depth, Motion, Template } from '@/lib/generation/kit/templates';
import type { ShopSlot } from '@/lib/shop/inject';

/**
 * A blueprint: a whole website, described before anybody asks for one.
 *
 * Lumen used to work the other way round. A prompt went to a model, the model
 * decided what a site for that business should contain, and the answer was
 * seven sections that could have belonged to anything. The structure was the
 * least reliable part of the output and it was the part that decided whether
 * the result looked professional.
 *
 * A blueprint moves that decision out of the model and into data written by
 * hand: this is what a dental clinic's home page contains, in this order, in
 * this design. The model's job shrinks to the thing it is good at — writing
 * this business's words into a shape that already works.
 *
 * It composes rather than duplicates. `design` names one of the design
 * templates, which already carry type, rhythm, motion and depth; `vertical`
 * names the tone and the action; the blueprint overrides what it needs and adds
 * the one thing neither of them had — the page architecture. That is why
 * adding the hundredth blueprint costs a paragraph rather than a component.
 */

export type BlueprintStyle =
  | 'modern'
  | 'premium'
  | 'minimal'
  | 'bold'
  | 'editorial'
  | 'warm'
  | 'clinical'
  | 'playful';

/** What the site can do. These are the library's filters. */
export type BlueprintFeature =
  | 'booking'
  | 'shop'
  | 'menu'
  | 'listings'
  | 'portfolio'
  | 'landing'
  | 'multipage'
  | 'enquiries'
  | 'courses'
  | 'rooms';

export interface BlueprintPage {
  path: string;
  title: string;
  /** The section architecture. Order is the order on the page. */
  sections: SectionKind[];
  shopSlot?: ShopSlot;
  hidden?: boolean;
  shopBands?: readonly ShopSlot[];
}

export interface Blueprint {
  id: string;
  /** The name on the card. Short, and not the industry. */
  name: string;
  /** Which group it is filed under in the library. */
  industry: string;
  /** The kinds of business it suits. Shown on the card, and searched. */
  businessTypes: string[];
  style: BlueprintStyle;
  /** One line under the name. What it feels like, not what it contains. */
  note: string;
  /** The design template this is built on, by id. */
  design: string;
  /** Overrides on that design, where this blueprint needs its own. */
  shape?: Partial<Template['shape']>;
  motion?: Motion;
  depth?: Depth;
  /** Steers the palette the model writes. Overrides the design's. */
  paletteBrief?: string;
  /** Layout overrides, on top of the design template's. */
  layouts?: Partial<Record<SectionKind, string>>;
  /** The vertical this inherits tone, action and shop behaviour from. */
  vertical: string;
  pages: BlueprintPage[];
  features: BlueprintFeature[];
  /** The one thing the site is built to get somebody to do. */
  action: string;
  /** The default meta description, before the business is known. */
  seoDescription: string;
}

/** Every section this blueprint draws, across every page. */
export function blueprintSections(blueprint: Blueprint): SectionKind[] {
  return blueprint.pages.flatMap((page) => page.sections);
}

/** The number on the card. Counted, never typed. */
export function sectionCount(blueprint: Blueprint): number {
  return blueprintSections(blueprint).length;
}

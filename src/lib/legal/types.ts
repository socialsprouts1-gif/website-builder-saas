/**
 * A legal document, as data.
 *
 * Structured rather than written as markup, for the same reason a generated
 * site's sections are: it can be rendered consistently, linked to by heading,
 * checked by a test, and translated later without anyone editing HTML. It also
 * means a document cannot quietly lose its "last updated" date or its contact
 * route, because both are fields rather than paragraphs somebody remembered.
 */

export type Block = { p: string } | { ul: string[] } | { ol: string[] };

export interface LegalSection {
  heading: string;
  blocks: Block[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  /** One line, for the index and the page description. */
  summary: string;
  /** ISO date. Shown, because a policy with no date is not a policy. */
  updated: string;
  /** Which group it sits under on the index. */
  group: 'Policies' | 'Using Lumen' | 'Trust';
  /** Read before the first heading. */
  intro: string[];
  sections: LegalSection[];
}

/** An anchor for a heading, so a clause can be linked to directly. */
export function anchorFor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

import { COOKIES, DPA, PRIVACY } from './documents/privacy';
import { ACCEPTABLE_USE, COMMUNITY, DISCLAIMER, TERMS } from './documents/terms';
import { CANCELLATION, REFUNDS, RETURNS, SHIPPING } from './documents/commerce';
import { ACCESSIBILITY, DISCLOSURE, SECURITY } from './documents/trust';
import type { LegalDocument } from './types';

/**
 * Every legal document, in the order they are listed.
 *
 * Cookie Preferences is deliberately not here: it is a screen that does
 * something rather than a document that says something, so it has its own page
 * and links back to the Cookie Policy.
 */
export const LEGAL_DOCUMENTS: LegalDocument[] = [
  TERMS,
  PRIVACY,
  COOKIES,
  REFUNDS,
  CANCELLATION,
  SHIPPING,
  RETURNS,
  DISCLAIMER,
  ACCESSIBILITY,
  DPA,
  ACCEPTABLE_USE,
  SECURITY,
  DISCLOSURE,
  COMMUNITY,
];

export function legalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug);
}

/** The groups, in the order they appear on the index. */
export const LEGAL_GROUPS = ['Policies', 'Using Lumen', 'Trust'] as const;

export function documentsInGroup(group: LegalDocument['group']): LegalDocument[] {
  return LEGAL_DOCUMENTS.filter((document) => document.group === group);
}

export * from './types';
export * from './company';

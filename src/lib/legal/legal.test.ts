import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGAL_DOCUMENTS, LEGAL_GROUPS, legalDocument } from './index';
import { anchorFor } from './types';
import { COMPANY, missingCompanyDetails } from './company';

describe('the legal documents', () => {
  it('has the ones a customer and a payment gateway both look for', () => {
    const slugs = LEGAL_DOCUMENTS.map((document) => document.slug);
    for (const required of [
      'terms-of-service',
      'privacy-policy',
      'refund-policy',
      'cancellation-policy',
      'shipping-policy',
      'return-exchange-policy',
    ]) {
      expect(slugs).toContain(required);
    }
  });

  it('gives every document a unique address', () => {
    const slugs = LEGAL_DOCUMENTS.map((document) => document.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('finds a document by its address, and nothing by a made-up one', () => {
    expect(legalDocument('privacy-policy')?.title).toBe('Privacy Policy');
    expect(legalDocument('../../etc/passwd')).toBeUndefined();
    expect(legalDocument('')).toBeUndefined();
  });

  /** A policy with no date is not a policy. */
  it('dates every document', () => {
    for (const document of LEGAL_DOCUMENTS) {
      expect(document.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(document.updated))).toBe(false);
    }
  });

  it('gives every document a title, a summary and something to read', () => {
    for (const document of LEGAL_DOCUMENTS) {
      expect(document.title.length).toBeGreaterThan(3);
      expect(document.summary.length).toBeGreaterThan(10);
      expect(document.sections.length).toBeGreaterThan(0);
      for (const section of document.sections) {
        expect(section.heading.length).toBeGreaterThan(2);
        expect(section.blocks.length).toBeGreaterThan(0);
      }
    }
  });

  it('puts every document in a group the index renders', () => {
    for (const document of LEGAL_DOCUMENTS) {
      expect(LEGAL_GROUPS).toContain(document.group);
    }
  });

  /**
   * Somebody reading a policy and wanting to act on it must never have to hunt
   * for how. Each one ends up somewhere they can write to.
   */
  it('gives every document a way to reach a person', () => {
    for (const document of LEGAL_DOCUMENTS) {
      const text = JSON.stringify(document);
      expect(text).toMatch(/@/);
    }
  });

  it('never leaves a heading that cannot be linked to', () => {
    for (const document of LEGAL_DOCUMENTS) {
      for (const section of document.sections) {
        expect(anchorFor(section.heading)).not.toBe('');
      }
    }
  });

  it('gives each document unique anchors, so a link goes where it says', () => {
    for (const document of LEGAL_DOCUMENTS) {
      const anchors = document.sections.map((section) => anchorFor(section.heading));
      expect(new Set(anchors).size).toBe(anchors.length);
    }
  });
});

describe('company details', () => {
  /**
   * The point is not that they are filled in — they are not yet — but that the
   * product knows which are missing, so a page can say so instead of printing
   * a placeholder as though it were a registered address.
   */
  it('knows which details are still missing', () => {
    const missing = missingCompanyDetails();
    expect(Array.isArray(missing)).toBe(true);
    for (const field of missing) expect(String(COMPANY[field] ?? '').trim()).toBe('');
  });

  it('reports nothing missing once they are set', () => {
    expect(
      missingCompanyDetails({
        ...COMPANY,
        legalName: 'Example Pvt Ltd',
        address: '1 Example Road, Akola',
        jurisdiction: 'Akola, Maharashtra',
        grievanceOfficer: 'A. Person',
      }),
    ).toEqual([]);
  });
});

describe('the footer', () => {
  const footer = readFileSync(join(process.cwd(), 'src/components/marketing/Footer.tsx'), 'utf8');

  /**
   * A footer promising a refund policy that 404s is worse than a footer that
   * promises nothing, and it is the kind of thing a payment gateway checks.
   */
  it('links only to policies that exist', () => {
    const links = [...footer.matchAll(/href: '\/legal\/([a-z-]+)'/g)].map((match) => match[1]);
    expect(links.length).toBeGreaterThan(0);
    for (const slug of links) {
      if (slug === 'cookie-preferences') continue;
      expect(legalDocument(slug), slug).toBeDefined();
    }
  });

  it('links the four a payment gateway asks for by name', () => {
    for (const slug of ['terms-of-service', 'privacy-policy', 'refund-policy', 'cancellation-policy']) {
      expect(footer).toContain(`/legal/${slug}`);
    }
  });
});

describe('anchorFor', () => {
  it('makes a heading into a link target', () => {
    expect(anchorFor('What we collect')).toBe('what-we-collect');
    expect(anchorFor('Refunds & returns!')).toBe('refunds-returns');
  });
});

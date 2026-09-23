import { describe, expect, it } from 'vitest';
import { INDUSTRIES } from './industries';
import { LEGAL_DOCUMENTS } from './legal';
import { canonicalUrl, noIndex, pageMetadata, publicPages, UNINDEXED_PAGES } from './metadata';

describe('canonicalUrl', () => {
  it('has no trailing slash, including on the home page', () => {
    expect(canonicalUrl('')).not.toMatch(/\/$/);
    expect(canonicalUrl('/')).toBe(canonicalUrl(''));
    expect(canonicalUrl('/pricing/')).toBe(canonicalUrl('/pricing'));
  });

  it('roots a path that arrives without a slash', () => {
    expect(canonicalUrl('pricing')).toBe(canonicalUrl('/pricing'));
  });

  it('is absolute, because a relative canonical says nothing about the host', () => {
    expect(canonicalUrl('/pricing')).toMatch(/^https?:\/\//);
  });
});

describe('the sitemap', () => {
  const paths = publicPages().map((page) => page.path);

  it('lists the home page once, as the root', () => {
    expect(paths.filter((path) => path === '')).toHaveLength(1);
  });

  it('has no duplicates', () => {
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('carries every per-trade page', () => {
    for (const industry of INDUSTRIES) {
      expect(paths).toContain(`/for/${industry.slug}`);
    }
  });

  it('carries every legal document', () => {
    for (const document of LEGAL_DOCUMENTS) {
      expect(paths).toContain(`/legal/${document.slug}`);
    }
  });

  /**
   * Submitting a URL that says "do not index me" is a Search Console warning
   * and, worse, a contradiction: the sitemap is a request to index.
   */
  it('never asks a search engine to index a page marked noindex', () => {
    for (const path of UNINDEXED_PAGES) {
      expect(paths).not.toContain(path);
    }
  });

  it('keeps every priority within the range a sitemap allows', () => {
    for (const page of publicPages()) {
      expect(page.priority).toBeGreaterThan(0);
      expect(page.priority).toBeLessThanOrEqual(1);
    }
  });
});

describe('pageMetadata', () => {
  const meta = pageMetadata({ title: 'Pricing', description: 'What it costs.', path: '/pricing' });

  it('points the canonical at this page, not at the home page', () => {
    expect(meta.alternates?.canonical).toBe(canonicalUrl('/pricing'));
  });

  it('gives the social card the same address', () => {
    expect(meta.openGraph?.url).toBe(canonicalUrl('/pricing'));
  });

  it('leaves the title bare so the layout template can add the brand', () => {
    expect(meta.title).toBe('Pricing');
  });

  it('takes the title as written when asked, so the brand is not doubled', () => {
    const home = pageMetadata({ title: 'Lumen — x', description: 'y', path: '', absoluteTitle: true });
    expect(home.title).toEqual({ absolute: 'Lumen — x' });
  });

  it('keeps a page out of the index when it is told to', () => {
    const hidden = pageMetadata({ title: 'x', description: 'y', path: '/z', index: false });
    expect(hidden.robots).toMatchObject({ index: false });
  });
});

describe('noIndex', () => {
  it('hides the page but still lets a crawler follow it out', () => {
    expect(noIndex('Signed out')).toEqual({
      title: 'Signed out',
      robots: { index: false, follow: true },
    });
  });
});

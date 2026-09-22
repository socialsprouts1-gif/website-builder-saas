import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGAL_DOCUMENTS } from '@/lib/legal';

/**
 * Every page this product promises somebody, checked as a file on disk.
 *
 * A footer link, a policy named in another policy, or a "Support" in an error
 * screen that 404s is worse than not offering it: somebody only follows those
 * links when something has already gone wrong for them. Nothing here renders
 * a component — it asks whether the route exists at all, which is the failure
 * that actually happens when a page is renamed or moved.
 */
const app = join(process.cwd(), 'src/app');

function routeExists(route: string): boolean {
  const segment = route.replace(/^\//, '');
  const base = segment ? join(app, segment) : app;
  return (
    existsSync(join(base, 'page.tsx')) ||
    existsSync(join(base, 'page.ts')) ||
    existsSync(join(base, 'route.ts'))
  );
}

describe('the pages a customer is sent to', () => {
  it.each([
    ['/login'],
    ['/signup'],
    ['/forgot-password'],
    ['/reset-password'],
    ['/verify-email'],
    ['/onboarding'],
    ['/app/settings/account'],
    ['/app/settings/billing'],
    ['/support'],
    ['/help'],
  ])('has %s', (route) => {
    expect(routeExists(route)).toBe(true);
  });
});

describe('the states a customer can land in', () => {
  it.each([
    ['/403'],
    ['/maintenance'],
    ['/offline'],
    ['/session-expired'],
    ['/billing/success'],
    ['/billing/failed'],
    ['/billing/pending'],
  ])('has %s', (route) => {
    expect(routeExists(route)).toBe(true);
  });

  /** These are Next's own special files, not ordinary routes. */
  it('has the not-found and error boundaries', () => {
    expect(existsSync(join(app, 'not-found.tsx'))).toBe(true);
    expect(existsSync(join(app, 'error.tsx'))).toBe(true);
    expect(existsSync(join(app, 'global-error.tsx'))).toBe(true);
  });
});

describe('the legal pages', () => {
  it('has an index and a page that renders any document', () => {
    expect(routeExists('/legal')).toBe(true);
    expect(existsSync(join(app, 'legal/[slug]/page.tsx'))).toBe(true);
  });

  it('has cookie preferences as its own screen', () => {
    expect(routeExists('/legal/cookie-preferences')).toBe(true);
  });

  /** All fifteen the request asked for, by the name they were asked for. */
  it.each([
    ['Privacy Policy', 'privacy-policy'],
    ['Terms of Service', 'terms-of-service'],
    ['Cookie Policy', 'cookie-policy'],
    ['Refund Policy', 'refund-policy'],
    ['Cancellation Policy', 'cancellation-policy'],
    ['Shipping Policy', 'shipping-policy'],
    ['Return / Exchange Policy', 'return-exchange-policy'],
    ['Disclaimer', 'disclaimer'],
    ['Accessibility Statement', 'accessibility-statement'],
    ['Data Processing Agreement', 'data-processing-agreement'],
    ['Acceptable Use Policy', 'acceptable-use-policy'],
    ['Security Policy', 'security-policy'],
    ['Responsible Disclosure', 'responsible-disclosure'],
    ['Community Guidelines', 'community-guidelines'],
  ])('covers %s', (title, slug) => {
    const document = LEGAL_DOCUMENTS.find((candidate) => candidate.slug === slug);
    expect(document, slug).toBeDefined();
    expect(document?.title).toBe(title);
  });
});

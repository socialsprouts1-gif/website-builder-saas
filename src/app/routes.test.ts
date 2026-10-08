import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGAL_DOCUMENTS } from '@/lib/legal';
import { FEATURE_LIST } from '@/lib/features';

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

/**
 * The admin panel's sections, and its navigation, which must be the same set.
 *
 * This split happened because everything lived on one page: revenue, thirty
 * days of model spend and the moderation queue were all rendered by /admin,
 * so the only way to any of them was to open a page that loaded all three.
 * Now each is its own screen — and the failure that replaces it is a screen
 * nobody can reach, because the nav was not told about it.
 */
describe('the admin panel', () => {
  const layout = readFileSync(join(app, 'admin/layout.tsx'), 'utf8');
  const linked = [...layout.matchAll(/AdminTab href="([^"]+)"/g)].map((match) => match[1]);

  it('links every section it has', () => {
    // The glob already carries the admin/ prefix; joining it on again gave
    // /admin/admin and a test that failed for its own reasons.
    const sections = globSync('admin/**/page.tsx', { cwd: app })
      .map((path) => `/${path.replace(/\\/g, '/').replace(/\/?page\.tsx$/, '')}`);

    expect(sections.length).toBeGreaterThanOrEqual(6);
    for (const section of sections) {
      expect(linked, `${section} exists but nothing links to it`).toContain(section);
    }
  });

  it('links nothing that is not there', () => {
    for (const href of linked) {
      expect(routeExists(href), `the nav offers ${href}, which does not exist`).toBe(true);
    }
  });

  /**
   * The point of the split. A reader should not have to open one page to get
   * to a different one, so the overview is an index — and an index that is
   * still rendering every table it used to is not an index.
   */
  it('keeps the overview an index rather than the whole panel', () => {
    const overview = readFileSync(join(app, 'admin/page.tsx'), 'utf8');
    // No tables on it, and every card is a way through to somewhere.
    expect(overview).not.toContain('<table');
    expect(overview).not.toContain('AdminTable');
    const cards = [...overview.matchAll(/<Stat\b/g)].length;
    const links = [...overview.matchAll(/href="\/admin/g)].length;
    expect(cards).toBeGreaterThanOrEqual(4);
    expect(links, 'every number on the overview should lead somewhere').toBe(cards);
  });
});

/**
 * A switch that hides a link has to hide a link that exists.
 *
 * `hiddenHrefs` is what the sidebar filters on, and it matches by exact href.
 * A feature whose href was renamed would quietly stop hiding anything — the
 * switch would read as working and the link would stay in the sidebar.
 */
describe('the feature switches', () => {
  it('name links that are real routes', () => {
    for (const feature of FEATURE_LIST) {
      if (!feature.href) continue;
      expect(routeExists(feature.href), `${feature.key} points at ${feature.href}`).toBe(true);
    }
  });

  /**
   * The gate that matters. Hiding a sidebar link is not a gate: the URL still
   * works, and for 3D it is an endpoint that spends real money on image
   * generation. Both the page and the build endpoint have to check.
   */
  it('are enforced on the server, not only in the sidebar', () => {
    const api = readFileSync(join(app, 'api/projects/route.ts'), 'utf8');
    expect(api).toContain('featuresFor');
    expect(api).toMatch(/features\.three_d/);
    expect(api).toMatch(/features\.google_import/);

    const studio = readFileSync(join(app, 'app/studio/page.tsx'), 'utf8');
    expect(studio).toContain('featuresFor');
    expect(studio).toContain('notFound()');
  });
});

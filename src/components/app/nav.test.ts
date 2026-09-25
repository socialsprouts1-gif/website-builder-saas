import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every link in the sidebar goes somewhere.
 *
 * A nav is the easiest thing in a product to pad out with entries that sound
 * right — a Team tab, an Analytics tab, a Workspace tab — and every one of
 * those is a click that ends in a 404, or worse an empty screen that reads as
 * broken rather than absent. So the rule is simple and checked: if it is in
 * the sidebar, the page is on disk.
 */
const source = readFileSync(join(process.cwd(), 'src/components/app/AppNav.tsx'), 'utf8');
const hrefs = [...source.matchAll(/href: '([^']+)'/g)].map(([, href]) => href);

function pageExists(route: string): boolean {
  const base = join(process.cwd(), 'src/app', route.replace(/^\//, ''));
  return ['page.tsx', 'page.ts'].some((file) => existsSync(join(base, file)));
}

describe('the sidebar', () => {
  it('found its links', () => {
    expect(hrefs.length).toBeGreaterThanOrEqual(10);
    expect(hrefs).toContain('/app');
  });

  it.each(hrefs.map((href) => [href]))('%s is a page that exists', (href) => {
    expect(pageExists(href), `${href} has no page.tsx`).toBe(true);
  });

  it('links nothing twice', () => {
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('groups the sites apart from the account', () => {
    expect(source).toContain("title: 'Workspace'");
    expect(source).toContain("title: 'Account'");
  });

  /**
   * `/app` and the settings pages are all prefixes of their siblings, so a
   * startsWith match lights several rows at once and the nav stops telling
   * you where you are.
   */
  it('matches the section roots exactly rather than by prefix', () => {
    expect(source).toContain("item.href === '/app' || item.href.startsWith('/app/settings/')");
  });
});

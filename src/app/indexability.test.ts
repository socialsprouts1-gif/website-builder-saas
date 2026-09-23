import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DISALLOWED_PREFIXES, UNINDEXED_PAGES, publicPages } from '@/lib/metadata';

/**
 * Every page on this domain has to have made a decision about being found.
 *
 * The failure this catches is silent in both directions and invisible in a
 * browser: a new marketing page that nobody adds to the sitemap is a page
 * Google will never hear about on a domain with no inbound links, and a new
 * "payment pending" screen that nobody marks noindex is a page that competes
 * with the real ones. Neither shows up in a build, a type check or a click
 * through the site.
 *
 * So: every page.tsx is either in the sitemap, explicitly unindexed, or behind
 * a prefix robots.txt shuts out. There is no fourth answer.
 */
const app = join(process.cwd(), 'src/app');

function pageRoutes(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    // Route groups are not part of the URL.
    if (entry.startsWith('(')) {
      found.push(...pageRoutes(full));
      continue;
    }
    for (const file of ['page.tsx', 'page.ts']) {
      try {
        statSync(join(full, file));
        found.push(`/${relative(app, full).replace(/\\/g, '/')}`);
        break;
      } catch {
        // No page here; it may still hold one further down.
      }
    }
    found.push(...pageRoutes(full));
  }
  return [...new Set(found)];
}

const sitemapPaths = new Set(publicPages().map((page) => page.path));
const unindexed = new Set<string>(UNINDEXED_PAGES);

function isCrawlerBlocked(route: string): boolean {
  return DISALLOWED_PREFIXES.some((prefix) => `${route}/`.startsWith(prefix));
}

/** A dynamic route is covered when the sitemap names pages underneath it. */
function isDynamic(route: string): boolean {
  return route.includes('[');
}

function coversDynamic(route: string): boolean {
  const prefix = `${route.slice(0, route.indexOf('['))}`;
  return [...sitemapPaths].some((path) => path.startsWith(prefix) && path !== prefix.replace(/\/$/, ''));
}

describe('every page decides whether it should be found', () => {
  const routes = pageRoutes(app).sort();

  it('found the pages at all, so a passing run means something', () => {
    expect(routes.length).toBeGreaterThan(30);
    expect(routes).toContain('/pricing');
  });

  it.each(routes.map((route) => [route]))('%s is in the sitemap, noindexed, or disallowed', (route) => {
    if (isCrawlerBlocked(route)) return;
    if (unindexed.has(route)) return;
    if (isDynamic(route)) {
      expect(coversDynamic(route), `${route} has no pages in the sitemap`).toBe(true);
      return;
    }
    expect(sitemapPaths.has(route), `${route} is in neither the sitemap nor UNINDEXED_PAGES`).toBe(true);
  });
});

describe('the pages marked noindex say so in their own source', () => {
  it.each(UNINDEXED_PAGES.map((route) => [route]))('%s declares it', (route) => {
    const source = readFileSync(join(app, route.replace(/^\//, ''), 'page.tsx'), 'utf8');
    expect(source).toMatch(/noIndex\(|unindexedMetadata\(|index: false/);
  });
});

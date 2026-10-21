import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The pieces that have to agree for a customer's domain to answer.
 *
 * Four files, none of which type-check against the others: the middleware
 * decides a request on ummclothing.in belongs to a published site, the site
 * route has to write its links from the root rather than from /s/<slug>/, the
 * API has to attach the www as well as the apex, and the panel has to stop
 * demanding a Vercel deployment that is no longer part of it.
 *
 * Every one of those was wrong at once, which is why connecting a domain had
 * never worked for anybody who was not already a developer.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const middleware = read('src/middleware.ts');
const siteRoute = read('src/app/s/[slug]/[[...path]]/route.ts');
const api = read('src/app/api/projects/[id]/domain/route.ts');
const panel = read('src/components/app/DomainPanel.tsx');
const deployPage = read('src/app/app/project/[id]/deploy/page.tsx');
const setup = read('supabase/setup.sql');

describe('a request on a customer’s domain', () => {
  it('is routed to their published site', () => {
    expect(middleware).toContain('siteForHostname');
    expect(middleware).toContain('NextResponse.rewrite');
  });

  /**
   * The files, not only the pages. The matcher used to exclude every image
   * extension, which is right on our own host and fatal on a customer's: the
   * page would render and every picture on it would 404.
   */
  it('lets their pictures through the matcher', () => {
    const matcher = middleware.slice(middleware.indexOf('matcher:'));
    expect(matcher).not.toMatch(/svg\|png\|jpg/);
  });

  it('still skips the session on our own static files', () => {
    expect(middleware).toContain('isStaticAsset(request.nextUrl.pathname)');
  });

  /** Serving the marketing page on a shop's domain reads as theft. */
  it('says so plainly when the domain is pointed here but connected to nothing', () => {
    expect(middleware).toMatch(/not connected to a site yet/);
    expect(middleware).toContain('status: 404');
  });
});

describe('the site, once it is on its own domain', () => {
  it('writes its links from the root', () => {
    expect(siteRoute).toContain("x-lumen-site-base");
    expect(siteRoute).toContain("onOwnDomain ? '/'");
  });

  /** The header is ours; a visitor sending it by hand must change nothing. */
  it('ignores the header on our own host', () => {
    const base = siteRoute.slice(siteRoute.indexOf('const onOwnDomain'));
    expect(base.slice(0, 600)).toContain('isCustomHost(');
  });
});

describe('connecting one', () => {
  it('no longer needs a Vercel deployment', () => {
    expect(api).not.toContain('vercel_project_id');
    expect(panel).not.toContain('Deploy to Vercel first');
    expect(deployPage).toContain('published={Boolean(project.published_at && project.public_slug)}');
  });

  it('needs a published site, and says which button that is', () => {
    expect(api).toMatch(/Publish the site first/);
  });

  /** A certificate for the apex alone is a certificate error on the www. */
  it('attaches the www with the apex', () => {
    expect(api).toContain('hostnamesToAttach');
  });

  it('refuses Lumen’s own address', () => {
    expect(api).toContain('env.canonicalOrigin');
    expect(api).toMatch(/Lumen’s own address/);
  });

  /** Buying spends real money, so it stays on the owner's own account. */
  it('explains what buying needs instead of failing silently', () => {
    expect(api).toMatch(/Buying a domain needs a Vercel account connected/);
    expect(api).toMatch(/If you already own a domain/);
  });
});

describe('the migration', () => {
  it('is in the one file people are told to run', () => {
    expect(setup).toContain('create table if not exists public.custom_domains');
    expect(setup).toContain('custom_domains_hostname_key');
  });

  /** It is read on the request path, so the hostname has to be indexed. */
  it('indexes the column every request looks up', () => {
    expect(setup).toMatch(/create unique index if not exists custom_domains_hostname_key[\s\S]{0,80}\(hostname\)/);
  });
});

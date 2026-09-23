import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Which address the site claims to live at.
 *
 * This is the bug that made the domain invisible rather than merely unranked:
 * with NEXT_PUBLIC_SITE_URL unset, `metadataBase` fell through to
 * http://localhost:3000, so every canonical link and every og:url a crawler
 * read named a machine on somebody's desk. The module reads process.env once
 * at import, which is why each case re-imports it.
 */
const ORIGINAL = { ...process.env };

async function loadEnv(vars: Record<string, string | undefined>) {
  vi.resetModules();
  for (const key of ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_ENV']) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return (await import('./env')).env;
}

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.unstubAllEnvs();
});

describe('the canonical origin', () => {
  it('uses NEXT_PUBLIC_SITE_URL when it is set', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_SITE_URL: 'https://www.lumensite.in' });
    expect(env.canonicalOrigin).toBe('https://www.lumensite.in');
  });

  it('never falls through to localhost in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const env = await loadEnv({});
    expect(env.canonicalOrigin).not.toContain('localhost');
    expect(env.canonicalOrigin).toMatch(/^https:\/\//);
  });

  it('prefers the real domain over the deployment URL a preview would give', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const env = await loadEnv({
      NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: 'website-builder-saas.vercel.app',
    });
    expect(env.canonicalOrigin).not.toContain('vercel.app');
  });

  it('carries no trailing slash, so canonicalUrl never doubles one', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_SITE_URL: 'https://www.lumensite.in/' });
    expect(env.canonicalOrigin).toBe('https://www.lumensite.in');
  });

  it('adds a scheme to a bare host', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_SITE_URL: 'www.lumensite.in' });
    expect(env.canonicalOrigin).toBe('https://www.lumensite.in');
  });
});

describe('which deployments invite a crawler in', () => {
  it('says yes on production', async () => {
    const env = await loadEnv({ VERCEL_ENV: 'production' });
    expect(env.indexable).toBe(true);
  });

  it('says no on a preview deployment, which is a duplicate of the real site', async () => {
    const env = await loadEnv({ VERCEL_ENV: 'preview' });
    expect(env.indexable).toBe(false);
  });

  it('says yes when there is no Vercel at all, so self-hosting is not silently hidden', async () => {
    const env = await loadEnv({});
    expect(env.indexable).toBe(true);
  });
});

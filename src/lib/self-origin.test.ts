import { describe, expect, it } from 'vitest';
import { selfOrigin } from './self-origin';

/** Headers as a route handler sees them. */
const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});

const FALLBACK = 'https://configured.example';

describe('selfOrigin', () => {
  /**
   * The point of the whole file: a custom domain works the moment it is
   * pointed here, without anybody remembering to change an environment
   * variable and redeploy.
   */
  it('follows the host the request actually arrived on', () => {
    expect(
      selfOrigin(headers({ 'x-forwarded-host': 'www.lumensite.in', 'x-forwarded-proto': 'https' }), FALLBACK),
    ).toBe('https://www.lumensite.in');
  });

  it('uses the plain host header when there is no proxy in front', () => {
    expect(selfOrigin(headers({ host: 'lumensite.in' }), FALLBACK)).toBe('https://lumensite.in');
  });

  /** A proxy chain gives a list; the first entry is the client-facing one. */
  it('takes the first host of a forwarded chain', () => {
    expect(
      selfOrigin(headers({ 'x-forwarded-host': 'www.lumensite.in, internal.vercel.app' }), FALLBACK),
    ).toBe('https://www.lumensite.in');
  });

  it('speaks http to a local dev server', () => {
    expect(selfOrigin(headers({ host: 'localhost:3000' }), FALLBACK)).toBe('http://localhost:3000');
    expect(selfOrigin(headers({ host: '127.0.0.1:3000' }), FALLBACK)).toBe('http://127.0.0.1:3000');
  });

  it('falls back to configuration when there is no host at all', () => {
    expect(selfOrigin(headers({}), FALLBACK)).toBe(FALLBACK);
  });

  /**
   * A Host header is supplied by whoever is calling. It ends up in embed
   * snippets and redirect URLs, so anything that is not plainly a hostname is
   * refused rather than escaped.
   */
  it('refuses a host that is not a host', () => {
    for (const host of [
      'evil.example/path',
      'evil.example"onload="x',
      'evil.example>',
      ' ',
    ]) {
      expect(selfOrigin(headers({ host }), FALLBACK)).toBe(FALLBACK);
    }
  });

  it('refuses a scheme that is not http or https', () => {
    expect(
      selfOrigin(headers({ host: 'lumensite.in', 'x-forwarded-proto': 'javascript' }), FALLBACK),
    ).toBe(FALLBACK);
  });
});

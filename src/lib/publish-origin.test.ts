import { describe, expect, it } from 'vitest';
import { publicUrl, shareOrigin } from './publish';

/**
 * Which address a published site is handed out on.
 *
 * The bug: the link came from whatever host the owner was browsing. On
 * lumensite.in the apex had stale A records left behind by the old host, so the
 * app in front of the owner worked and every link they sent a customer landed
 * on somebody else's parking page. The app cannot fix their DNS, but it can
 * stop handing out the address that does not work.
 */
describe('shareOrigin', () => {
  it('prefers the configured public address over wherever the owner is', () => {
    expect(shareOrigin('https://www.lumensite.in', 'https://lumensite.in')).toBe(
      'https://www.lumensite.in',
    );
    expect(shareOrigin('https://www.lumensite.in', 'https://lumen-abc123.vercel.app')).toBe(
      'https://www.lumensite.in',
    );
  });

  it('falls back to the current host on a preview deployment, which has no other address', () => {
    expect(shareOrigin(null, 'https://lumen-abc123.vercel.app')).toBe('https://lumen-abc123.vercel.app');
    expect(shareOrigin('', 'https://lumen-abc123.vercel.app')).toBe('https://lumen-abc123.vercel.app');
  });

  it('never hands out a localhost link to a customer', () => {
    expect(shareOrigin('http://localhost:3000', 'https://www.lumensite.in')).toBe(
      'https://www.lumensite.in',
    );
    expect(shareOrigin('https://localhost:3000', 'https://www.lumensite.in')).toBe(
      'https://www.lumensite.in',
    );
  });

  it('refuses a configured address that is not https', () => {
    expect(shareOrigin('http://www.lumensite.in', 'https://lumensite.in')).toBe('https://lumensite.in');
  });

  it('never doubles the slash before /s/', () => {
    expect(publicUrl(shareOrigin('https://www.lumensite.in/', 'x'), 'neura-shop')).toBe(
      'https://www.lumensite.in/s/neura-shop',
    );
  });
});

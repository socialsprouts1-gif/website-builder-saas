import { describe, expect, it } from 'vitest';
import { canonicalRedirect } from './canonical-host';

const CANONICAL = 'https://www.lumensite.in';

describe('canonicalRedirect', () => {
  it('moves the apex to the host everything else uses', () => {
    expect(canonicalRedirect('lumensite.in', CANONICAL)).toBe('www.lumensite.in');
  });

  it('leaves the canonical host alone, so it cannot redirect to itself', () => {
    expect(canonicalRedirect('www.lumensite.in', CANONICAL)).toBeNull();
  });

  it('works the other way round when the apex is the configured one', () => {
    expect(canonicalRedirect('www.lumensite.in', 'https://lumensite.in')).toBe('lumensite.in');
  });

  /**
   * The dangerous case. A customer points their own domain at this deployment;
   * redirecting them to lumensite.in would take their visitors off their site.
   */
  it('never moves somebody else’s domain', () => {
    expect(canonicalRedirect('smilecare.in', CANONICAL)).toBeNull();
    expect(canonicalRedirect('www.neurashop.com', CANONICAL)).toBeNull();
    expect(canonicalRedirect('lumensite.in.evil.example', CANONICAL)).toBeNull();
  });

  it('leaves development and preview addresses where they are', () => {
    expect(canonicalRedirect('localhost:3000', CANONICAL)).toBeNull();
    expect(canonicalRedirect('127.0.0.1:3000', CANONICAL)).toBeNull();
    expect(canonicalRedirect('lumen-abc123.vercel.app', CANONICAL)).toBeNull();
  });

  it('reads the first host when a proxy sends a list', () => {
    expect(canonicalRedirect('lumensite.in, 10.0.0.1', CANONICAL)).toBe('www.lumensite.in');
  });

  it('does nothing when there is no host or no configured address', () => {
    expect(canonicalRedirect(null, CANONICAL)).toBeNull();
    expect(canonicalRedirect('lumensite.in', 'not a url')).toBeNull();
  });
});

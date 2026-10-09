import { afterEach, describe, expect, it } from 'vitest';
import { isOwnAsset } from './asset-url';

/**
 * This is the gate on a picture an owner types in rather than uploads.
 *
 * The chatbot avatar can be set from a URL, and whatever goes in renders
 * inside an <img> on the published site — in front of that owner's customers.
 * So the check is not cosmetic: it is the difference between a logo and a
 * `javascript:` scheme, or a 1×1 tracker on a page somebody trusts.
 */

const original = process.env.NEXT_PUBLIC_SUPABASE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = original;
});

describe('what counts as our own asset', () => {
  it('accepts this deployment’s own storage host', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdefgh.supabase.co';
    expect(
      isOwnAsset('https://abcdefgh.supabase.co/storage/v1/object/public/assets/logo.png'),
    ).toBe(true);
  });

  it('accepts any supabase storage host by shape', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(isOwnAsset('https://zzzz.supabase.co/storage/v1/object/public/a/b.png')).toBe(true);
    expect(isOwnAsset('https://zzzz.supabase.in/storage/v1/object/public/a/b.png')).toBe(true);
  });

  it('refuses every other host', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(isOwnAsset('https://example.com/logo.png')).toBe(false);
    expect(isOwnAsset('https://cdn.tracker.io/pixel.gif')).toBe(false);
  });

  /**
   * The ones that matter. A host ending in the right letters is not the same
   * as a host on the right domain, and an attacker picks the names.
   */
  it('is not fooled by a lookalike host', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(isOwnAsset('https://evil-supabase.co/logo.png')).toBe(false);
    expect(isOwnAsset('https://supabase.co.evil.com/logo.png')).toBe(false);
    expect(isOwnAsset('https://notsupabase.com/logo.png')).toBe(false);
  });

  it('refuses every scheme but https', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(isOwnAsset('http://zzzz.supabase.co/logo.png')).toBe(false);
    expect(isOwnAsset('javascript:alert(1)')).toBe(false);
    expect(isOwnAsset('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(false);
    expect(isOwnAsset('//zzzz.supabase.co/logo.png')).toBe(false);
  });

  it('refuses what is not a URL at all', () => {
    expect(isOwnAsset('')).toBe(false);
    expect(isOwnAsset('logo.png')).toBe(false);
    expect(isOwnAsset('   ')).toBe(false);
  });

  /** A broken env var must not turn into an open door. */
  it('ignores an unparseable configured host', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not a url';
    expect(isOwnAsset('https://example.com/logo.png')).toBe(false);
    expect(isOwnAsset('https://zzzz.supabase.co/logo.png')).toBe(true);
  });
});

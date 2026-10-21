import { describe, expect, it } from 'vitest';
import {
  APEX_A,
  SUBDOMAIN_CNAME,
  apexOf,
  dnsRowsFor,
  hostnamesToAttach,
  isApex,
  isApplicationPath,
  isCustomHost,
  isStaticAsset,
  normaliseHostname,
} from './domains';

/**
 * Connecting a domain is the step that decides whether somebody has a website
 * or a link. It is also the step most of them do once, at eleven at night, on
 * a registrar's control panel they have never opened before — so every way of
 * typing the same domain has to be the same domain, and the records shown have
 * to be the records that work.
 */

describe('what somebody typed', () => {
  it('takes a plain domain', () => {
    expect(normaliseHostname('ummclothing.in')).toBe('ummclothing.in');
  });

  it('takes the ways people actually paste one', () => {
    for (const value of [
      'https://ummclothing.in',
      'http://ummclothing.in/',
      'https://www.ummclothing.in/shop?x=1',
      '  UMMClothing.IN  ',
      'ummclothing.in.',
      'ummclothing.in:443',
    ]) {
      expect(normaliseHostname(value), value).toMatch(/^(www\.)?ummclothing\.in$/);
    }
  });

  it('keeps a subdomain', () => {
    expect(normaliseHostname('shop.ummclothing.in')).toBe('shop.ummclothing.in');
  });

  it('refuses what is not a domain', () => {
    for (const value of ['', '   ', 'localhost', 'ummclothing', 'umm clothing.in', '-bad.in', 'bad-.in', '.in']) {
      expect(normaliseHostname(value), value).toBeNull();
    }
  });

  it('refuses a name longer than DNS allows', () => {
    expect(normaliseHostname(`${'a'.repeat(64)}.in`)).toBeNull();
    expect(normaliseHostname(`${'a.'.repeat(130)}in`)).toBeNull();
  });
});

describe('root or not', () => {
  it('reads two labels as the root', () => {
    expect(isApex('ummclothing.in')).toBe(true);
    expect(isApex('shop.com')).toBe(true);
  });

  /**
   * The ending India actually uses. Treating shop.co.in as a subdomain gives
   * its owner a CNAME on `shop` — which is wrong, and at most registrars is
   * not even accepted on a root record.
   */
  it('reads a compound ending as the root too', () => {
    expect(isApex('ummclothing.co.in')).toBe(true);
    expect(isApex('shop.org.in')).toBe(true);
    expect(isApex('shop.co.uk')).toBe(true);
  });

  it('reads a real subdomain as a subdomain', () => {
    expect(isApex('www.ummclothing.in')).toBe(false);
    expect(isApex('shop.ummclothing.co.in')).toBe(false);
  });

  it('finds the root a name belongs to', () => {
    expect(apexOf('www.ummclothing.in')).toBe('ummclothing.in');
    expect(apexOf('ummclothing.in')).toBe('ummclothing.in');
    expect(apexOf('shop.ummclothing.co.in')).toBe('ummclothing.co.in');
    expect(apexOf('a.b.c.shop.com')).toBe('shop.com');
  });
});

describe('the records to enter at the registrar', () => {
  /**
   * Both of them. Every domain Lumen has lost to "it does not work" lost it to
   * one of these two missing: the root typed without www, or the www everybody
   * types out of habit.
   */
  it('gives a root domain its A record and its www', () => {
    const rows = dnsRowsFor('ummclothing.in');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ type: 'A', name: '@', value: APEX_A });
    expect(rows[1]).toMatchObject({ type: 'CNAME', name: 'www', value: SUBDOMAIN_CNAME });
  });

  it('gives a subdomain one CNAME on its own label', () => {
    const rows = dnsRowsFor('shop.ummclothing.in');
    expect(rows).toEqual([
      expect.objectContaining({ type: 'CNAME', name: 'shop', value: SUBDOMAIN_CNAME }),
    ]);
  });

  it('says what each row is for, in words a shop owner can read', () => {
    for (const row of dnsRowsFor('ummclothing.in')) {
      expect(row.purpose).toMatch(/ummclothing\.in/);
      expect(row.purpose).not.toMatch(/vercel|dns record|alias/i);
    }
  });

  /** A certificate for the root alone is a certificate error on the www. */
  it('attaches both names for a root domain', () => {
    expect(hostnamesToAttach('ummclothing.in')).toEqual(['ummclothing.in', 'www.ummclothing.in']);
    expect(hostnamesToAttach('shop.ummclothing.in')).toEqual(['shop.ummclothing.in']);
  });
});

describe('whose domain a request arrived on', () => {
  const canonical = 'https://www.lumensite.in';

  it('is nobody when it is Lumen itself', () => {
    expect(isCustomHost('www.lumensite.in', canonical)).toBeNull();
    expect(isCustomHost('lumensite.in', canonical)).toBeNull();
  });

  it('is nobody on a preview build or a laptop', () => {
    expect(isCustomHost('lumen-git-main.vercel.app', canonical)).toBeNull();
    expect(isCustomHost('localhost:3000', canonical)).toBeNull();
    expect(isCustomHost('127.0.0.1:3000', canonical)).toBeNull();
  });

  it('is the customer when it is anything else', () => {
    expect(isCustomHost('ummclothing.in', canonical)).toBe('ummclothing.in');
    expect(isCustomHost('www.ummclothing.in', canonical)).toBe('www.ummclothing.in');
  });

  /** Proxies send a list; the first entry is the one the visitor typed. */
  it('reads the first host out of a forwarded list', () => {
    expect(isCustomHost('ummclothing.in, lumen.vercel.app', canonical)).toBe('ummclothing.in');
  });

  it('says nobody rather than guessing when it has no host', () => {
    expect(isCustomHost(null, canonical)).toBeNull();
    expect(isCustomHost('', canonical)).toBeNull();
    expect(isCustomHost('ummclothing.in', 'not a url')).toBeNull();
  });
});

describe('what answers on a customer’s domain', () => {
  it('serves their files for an ordinary page', () => {
    for (const path of ['/', '/index.html', '/shop.html', '/styles.css', '/logo.png', '/sitemap.xml']) {
      expect(isApplicationPath(path), path).toBe(false);
    }
  });

  /**
   * The chat bubble on a published page asks for its script root-relative, so
   * on ummclothing.in that address has to reach Lumen. Routing it to the
   * shop's files instead is a 404 and a site with no assistant on it.
   */
  it('keeps the chatbot and embed endpoints for Lumen', () => {
    expect(isApplicationPath('/api/chatbot/abc123/widget')).toBe(false);
    expect(isApplicationPath('/api/embed/abc123')).toBe(false);
  });

  it('never hands over the rest of the application', () => {
    for (const path of ['/api/projects/1/chat', '/api/billing/webhook', '/_next/static/x.js']) {
      expect(isApplicationPath(path), path).toBe(true);
    }
  });
});

describe('what is not worth a session lookup', () => {
  it('skips files', () => {
    for (const path of ['/logo.png', '/a/b.webp', '/styles.css', '/script.js', '/robots.txt', '/f.woff2']) {
      expect(isStaticAsset(path), path).toBe(true);
    }
  });

  it('does not skip pages', () => {
    for (const path of ['/', '/app', '/app/project/1', '/s/umm-clothing/']) {
      expect(isStaticAsset(path), path).toBe(false);
    }
  });
});

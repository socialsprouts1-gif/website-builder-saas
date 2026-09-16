import { describe, expect, it } from 'vitest';
import { localBusinessJsonLd, renderRobots, renderSitemap, withSeoHead, type SiteFacts } from './seo';

const FACTS: SiteFacts = {
  businessName: 'KITS aeropilots',
  description: 'Aviation coaching in Akola',
  category: 'Coaching centre',
  address: null,
  phone: null,
  faviconUrl: 'https://cdn.example/icon.png',
};

const PAGE = '<!doctype html><html><head><title>Home</title></head><body><h1>x</h1></body></html>';
const URL_ = 'https://lumen.app/s/kits/';

describe('withSeoHead', () => {
  const out = withSeoHead(PAGE, { pageUrl: URL_, leadsEndpoint: '/api/leads/kits', facts: FACTS });

  it('gives a search engine a canonical address', () => {
    expect(out).toContain(`<link rel="canonical" href="${URL_}" />`);
    expect(out).toContain(`<meta property="og:url" content="${URL_}" />`);
  });

  it('says what kind of thing the business is', () => {
    expect(out).toMatch(/application\/ld\+json/);
    expect(out).toMatch(/"@type":"LocalBusiness"/);
    expect(out).toContain('KITS aeropilots');
  });

  // Without this the enquiry form has nowhere to send a lead, which is the
  // whole of the fix it belongs to.
  it('tells the page where to send enquiries', () => {
    expect(out).toContain('<meta name="lumen-leads" content="/api/leads/kits" />');
  });

  it('leaves the page itself alone', () => {
    expect(out).toContain('<h1>x</h1>');
    expect(out.indexOf('canonical')).toBeLessThan(out.indexOf('</head>'));
  });

  it('cannot double up when the same page is served twice', () => {
    const twice = withSeoHead(out, { pageUrl: URL_, leadsEndpoint: '/api/leads/kits', facts: FACTS });
    expect(twice.match(/rel="canonical"/g)).toHaveLength(1);
    expect(twice.match(/application\/ld\+json/g)).toHaveLength(1);
    expect(twice.match(/lumen-leads/g)).toHaveLength(1);
  });

  it('defers to a canonical the page already declares', () => {
    const own = withSeoHead('<html><head><link rel="canonical" href="https://mine.example/"></head></html>', {
      pageUrl: URL_,
      facts: FACTS,
    });
    expect(own).toContain('https://mine.example/');
    expect(own).not.toContain(`canonical" href="${URL_}`);
  });

  it('has nothing to add to a fragment', () => {
    expect(withSeoHead('<div>hi</div>', { pageUrl: URL_ })).toBe('<div>hi</div>');
  });
});

describe('localBusinessJsonLd', () => {
  // Structured data that is wrong is worse than structured data that is thin,
  // because a search engine indexes it and then believes it.
  it('leaves out what the listing never gave us', () => {
    const thin = localBusinessJsonLd(
      { businessName: 'X', description: null, category: null, address: null, phone: null, faviconUrl: null },
      URL_,
    );
    expect(thin).not.toMatch(/address/);
    expect(thin).not.toMatch(/telephone/);
    expect(thin).toMatch(/"name":"X"/);
  });

  it('cannot be broken out of by a business name', () => {
    const nasty = localBusinessJsonLd(
      { ...FACTS, businessName: '</script><img src=x onerror=alert(1)>' },
      URL_,
    );
    expect(nasty).not.toMatch(/<\/script><img/i);
    expect(nasty).toMatch(/\\u003c/);
  });
});

describe('renderSitemap', () => {
  const map = renderSitemap('https://lumen.app', '/s/kits/', ['index.html', 'about.html', 'contact.html']);

  it('is a sitemap', () => {
    expect(map.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(map.match(/<url>/g)).toHaveLength(3);
    expect(map).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });

  it('lists the home page as the address people would type', () => {
    expect(map).toContain('<loc>https://lumen.app/s/kits/</loc>');
    expect(map).toContain('<loc>https://lumen.app/s/kits/about.html</loc>');
  });
});

describe('renderRobots', () => {
  it('invites crawlers and points them at the sitemap', () => {
    const robots = renderRobots('https://lumen.app', '/s/kits/');
    expect(robots).toMatch(/Allow: \//);
    expect(robots).toContain('Sitemap: https://lumen.app/s/kits/sitemap.xml');
  });
});

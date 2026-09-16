import { escapeHtml } from '@/lib/generation/kit/sections';

/**
 * The half of a business website that decides whether anyone ever sees it.
 *
 * A site for a shop in Akola exists to be found when someone searches for a
 * shop in Akola. Lumen was writing beautiful pages with no canonical address,
 * no structured data and no sitemap — so a search engine had no way to know
 * what the business was, where it was, or which pages existed.
 *
 * Added where the site is served rather than baked into the files, for the same
 * reason the assistant is: the public address is not known at build time, and
 * every site already published gains this without being regenerated.
 */

export interface SiteFacts {
  businessName: string;
  description: string | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  faviconUrl: string | null;
}

/**
 * What a search engine needs, as JSON-LD.
 *
 * LocalBusiness rather than Organization: the whole point is the map pin, the
 * phone number and the "near me" search. Fields the listing never gave us are
 * left out — an empty or invented address is worse than none, because it is
 * indexed and then believed.
 */
export function localBusinessJsonLd(facts: SiteFacts, pageUrl: string): string {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: facts.businessName,
    url: pageUrl,
  };

  if (facts.description) data.description = facts.description;
  if (facts.phone) data.telephone = facts.phone;
  if (facts.address) data.address = { '@type': 'PostalAddress', streetAddress: facts.address };
  if (facts.faviconUrl) data.image = facts.faviconUrl;

  // Escaped so a business name containing a quote or an angle bracket cannot
  // close the script tag it is being written into.
  return `<script type="application/ld+json">${JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')}</script>`;
}

/**
 * Canonical address, social preview, and the lead endpoint, added to the head.
 *
 * Idempotent: a page that already carries one of these keeps the one it has,
 * so serving the same file twice cannot double up.
 */
export function withSeoHead(
  html: string,
  options: { pageUrl: string; leadsEndpoint?: string | null; facts?: SiteFacts | null },
): string {
  if (!/<head[^>]*>/i.test(html)) return html;

  const tags: string[] = [];
  const has = (pattern: RegExp) => pattern.test(html);

  if (!has(/<link[^>]+rel=["']canonical["']/i)) {
    tags.push(`<link rel="canonical" href="${escapeHtml(options.pageUrl)}" />`);
  }
  if (!has(/<meta[^>]+property=["']og:url["']/i)) {
    tags.push(`<meta property="og:url" content="${escapeHtml(options.pageUrl)}" />`);
  }
  if (!has(/<meta[^>]+name=["']twitter:card["']/i)) {
    tags.push('<meta name="twitter:card" content="summary_large_image" />');
  }
  if (options.facts && !has(/application\/ld\+json/i)) {
    tags.push(localBusinessJsonLd(options.facts, options.pageUrl));
  }
  if (options.leadsEndpoint && !has(/<meta[^>]+name=["']lumen-leads["']/i)) {
    tags.push(`<meta name="lumen-leads" content="${escapeHtml(options.leadsEndpoint)}" />`);
  }

  if (tags.length === 0) return html;
  return html.replace(/<head([^>]*)>/i, (match) => `${match}\n${tags.join('\n')}`);
}

/** Every page of the site, as the one file a search engine asks for first. */
export function renderSitemap(origin: string, base: string, pages: string[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const urls = pages
    .map((page) => {
      // index.html is the site's front door and should be indexed as the
      // directory, not as a filename nobody would ever type or link to.
      const path = page === 'index.html' ? '' : page;
      return `  <url>\n    <loc>${escapeHtml(`${origin}${base}${path}`)}</loc>\n    <lastmod>${now}</lastmod>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function renderRobots(origin: string, base: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}${base}sitemap.xml\n`;
}

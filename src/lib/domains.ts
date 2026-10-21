/**
 * A customer's own domain, pointed at Lumen rather than at their own hosting.
 *
 * Connecting a domain used to mean: connect a Vercel account, deploy the site
 * to it, and only then enter the domain. Three technical steps for a shop
 * owner in Akola who has one domain from GoDaddy and no idea what Vercel is —
 * which is why nobody ever got to the end of it.
 *
 * So Lumen holds the domain itself. The owner adds two DNS records at whoever
 * they bought it from, and the site they already published answers on it.
 * Everything in here is the part of that which can be decided without a
 * network: what counts as a domain, which records to show, and whether a
 * request that arrived belongs to somebody's own domain or to Lumen.
 */

/** Where an apex domain points. Vercel's documented address for a project. */
export const APEX_A = '76.76.21.21';
/** Where anything below the apex points. */
export const SUBDOMAIN_CNAME = 'cname.vercel-dns.com';

export interface DnsRow {
  type: 'A' | 'CNAME' | 'TXT';
  /** As the registrar's form wants it: `@` for the root, or the label. */
  name: string;
  value: string;
  purpose: string;
}

/**
 * What somebody typed, as a hostname, or null.
 *
 * People paste `https://www.shop.com/`, type `WWW.Shop.com `, or copy it out
 * of an email with a full stop after it. All of those are the same domain and
 * all of them used to be rejected as "not a domain name".
 */
export function normaliseHostname(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  // A pasted address: take its host and drop the rest.
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  value = value.split('/')[0];
  value = value.split('?')[0];
  value = value.split('#')[0];
  // Credentials and a port are not part of the name.
  value = value.split('@').pop() ?? '';
  value = value.split(':')[0];
  // A trailing dot is a valid fully-qualified name and a confusing one.
  value = value.replace(/\.+$/, '');

  if (!value || value.length > 253) return null;
  const labels = value.split('.');
  if (labels.length < 2) return null;
  for (const label of labels) {
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) return null;
  }
  // A bare public suffix is not a domain somebody owns.
  if (labels[labels.length - 1].length < 2) return null;
  return value;
}

/**
 * Whether this is the root of a domain rather than something under it.
 *
 * Two labels is the root — shop.com. Three is usually a subdomain, except for
 * the compound endings India actually uses: shop.co.in and shop.org.in are
 * roots, and their owners enter them at the registrar as `@`.
 */
const COMPOUND_SUFFIXES = ['co.in', 'net.in', 'org.in', 'firm.in', 'gen.in', 'ind.in', 'co.uk', 'org.uk', 'com.au'];

export function isApex(hostname: string): boolean {
  const labels = hostname.split('.');
  if (labels.length === 2) return true;
  if (labels.length === 3) {
    return COMPOUND_SUFFIXES.includes(labels.slice(1).join('.'));
  }
  return false;
}

/** The apex a hostname belongs to: www.shop.co.in → shop.co.in. */
export function apexOf(hostname: string): string {
  let current = hostname;
  // Drop one label at a time until the rest is a root. Stops at two labels
  // whatever happens, so this cannot run off the end of the name.
  while (!isApex(current) && current.split('.').length > 2) {
    current = current.split('.').slice(1).join('.');
  }
  return current;
}

/**
 * The records to put at the registrar, in the order they should be entered.
 *
 * A root domain gets an A record and its www gets a CNAME, because somebody
 * who types shop.com and somebody who types www.shop.com must both arrive.
 * Every site Lumen has lost to "the domain does not work" lost it to exactly
 * one of those two being missing.
 */
export function dnsRowsFor(hostname: string): DnsRow[] {
  if (isApex(hostname)) {
    return [
      {
        type: 'A',
        name: '@',
        value: APEX_A,
        purpose: `Sends ${hostname} to your site.`,
      },
      {
        type: 'CNAME',
        name: 'www',
        value: SUBDOMAIN_CNAME,
        purpose: `Sends www.${hostname} to the same place.`,
      },
    ];
  }

  return [
    {
      type: 'CNAME',
      name: hostname.split('.')[0],
      value: SUBDOMAIN_CNAME,
      purpose: `Sends ${hostname} to your site.`,
    },
  ];
}

/**
 * Both names a connected domain should answer on.
 *
 * Adding only what was typed is how shop.com works and www.shop.com shows a
 * certificate error — which the owner reports as "the domain is broken", and
 * they are right.
 */
export function hostnamesToAttach(hostname: string): string[] {
  return isApex(hostname) ? [hostname, `www.${hostname}`] : [hostname];
}

/**
 * Whether a request's host is somebody's own domain rather than one of ours.
 *
 * Everything that is not Lumen, not a preview build and not a development
 * machine is a customer's domain, and has to be looked up. Getting this wrong
 * in the permissive direction costs a database read on a request that was
 * already going to 404; getting it wrong the other way serves the marketing
 * site on a shop's domain.
 */
export function isCustomHost(requestHost: string | null | undefined, canonicalOrigin: string): string | null {
  const host = requestHost?.split(',')[0]?.trim().toLowerCase().replace(/:\d+$/, '');
  if (!host) return null;

  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return null;
  if (host.endsWith('.vercel.app')) return null;
  if (host.endsWith('.local')) return null;

  let canonical: string;
  try {
    canonical = new URL(canonicalOrigin).host.toLowerCase().replace(/:\d+$/, '');
  } catch {
    return null;
  }
  const strip = (value: string) => (value.startsWith('www.') ? value.slice(4) : value);
  if (strip(host) === strip(canonical)) return null;

  return host;
}

/**
 * A path the application serves for itself, even on somebody else's domain.
 *
 * The chat widget on a published page asks for /api/chatbot/<key>/widget
 * root-relative, so on ummclothing.in that address has to reach Lumen rather
 * than be looked for among the shop's files. The same goes for the embed
 * endpoints. Everything else under /api is Lumen's own and has no business
 * answering on a customer's domain at all.
 */
export function isApplicationPath(pathname: string): boolean {
  if (pathname.startsWith('/_next/') || pathname.startsWith('/__nextjs')) return true;
  if (!pathname.startsWith('/api/')) return false;
  return !pathname.startsWith('/api/chatbot') && !pathname.startsWith('/api/embed');
}

/** A file that never needs a session looked up before it is served. */
export function isStaticAsset(pathname: string): boolean {
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml|woff2?|mp4|webm)$/i.test(pathname);
}

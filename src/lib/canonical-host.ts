/**
 * Sending a request to the one host this site is known by.
 *
 * Two hosts answering the same content is a slow, quiet problem: search engines
 * index both and rank neither, cookies set on one are not sent to the other, and
 * a link shared from the wrong one can break entirely. lumensite.in hit the
 * worst version of that — the apex kept A records from the previous host
 * alongside the new one, so a third of visitors reached the app and the rest
 * reached a parking page. DNS is the only real fix for that; this makes sure
 * every request that does arrive ends up on the address everything else uses.
 *
 * Pure, because getting it wrong redirects a site to itself forever.
 */
export function canonicalRedirect(
  requestHost: string | null | undefined,
  canonicalOrigin: string,
): string | null {
  const host = requestHost?.split(',')[0]?.trim().toLowerCase();
  if (!host) return null;

  let canonicalHost: string;
  try {
    canonicalHost = new URL(canonicalOrigin).host.toLowerCase();
  } catch {
    return null;
  }

  // Nothing to move to, and nothing to move from.
  if (!canonicalHost || host === canonicalHost) return null;

  // Never redirect away from a local or preview address. They are legitimate
  // ways to reach this deployment and the canonical host is a different one.
  const bare = host.replace(/:\d+$/, '');
  if (bare === 'localhost' || bare === '127.0.0.1' || bare === '[::1]') return null;
  if (bare.endsWith('.vercel.app')) return null;

  // Only the two forms of the same domain: apex to www, or www to apex. A host
  // that is not one of those belongs to somebody else — a customer's own domain
  // pointed at this deployment — and must be left exactly where it is.
  const strip = (value: string) => (value.startsWith('www.') ? value.slice(4) : value);
  if (strip(bare) !== strip(canonicalHost)) return null;

  return canonicalHost;
}

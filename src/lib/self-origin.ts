/**
 * Where this deployment can reach itself.
 *
 * Taken from the request being served, never from configuration. The app runs
 * on preview URLs as well as its own domain, and NEXT_PUBLIC_SITE_URL — which
 * falls back to localhost — points at neither. A background step addressed that
 * way lands on a different deployment or on nothing at all, which is how a
 * build stopped at 20% with its next step never run.
 */
export function selfOrigin(
  headers: { get(name: string): string | null },
  fallback: string,
): string {
  // x-forwarded-host is what a proxy sets; host is what a direct request has.
  const forwarded = headers.get('x-forwarded-host') ?? headers.get('host');
  const host = forwarded?.split(',')[0]?.trim();
  if (!host || !/^[A-Za-z0-9.:_-]+$/.test(host)) return fallback;

  const proto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const scheme = proto ?? (isLocal(host) ? 'http' : 'https');
  if (scheme !== 'http' && scheme !== 'https') return fallback;

  return `${scheme}://${host}`;
}

function isLocal(host: string): boolean {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
}

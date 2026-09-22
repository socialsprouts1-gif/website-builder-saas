import 'server-only';
import { headers } from 'next/headers';
import { env } from '@/lib/env';
import { selfOrigin } from '@/lib/self-origin';

/**
 * The address this page is actually being served on.
 *
 * Read from the request rather than from configuration, because the two
 * disagree more often than is comfortable: NEXT_PUBLIC_SITE_URL is baked in at
 * build time, is scoped per environment on Vercel, and is simply absent from a
 * preview build — so a link built from it can point at a deployment nobody is
 * looking at, or at the old hostname for as long as it takes somebody to
 * remember the variable exists.
 *
 * That matters most for anything handed to someone else. A chatbot embed
 * snippet is pasted into a customer's own website and stays there; if it
 * carries the wrong hostname, it keeps carrying it. Reading the host makes the
 * snippet correct by construction on whatever domain the owner copied it from.
 *
 * Configuration still wins where a fixed canonical address is the point — the
 * marketing sitemap, and the OAuth redirect URIs registered with each provider,
 * which must match a value a preview deployment cannot change.
 */
export async function requestOrigin(): Promise<string> {
  return selfOrigin(await headers(), env.siteUrl);
}

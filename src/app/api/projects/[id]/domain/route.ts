import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { loadAccountContext } from '@/lib/connectors/registry';
import { SUGGESTED_TLDS, buyDomain, checkDomain, toDomainLabel } from '@/lib/vercel';
import {
  NOT_CONFIGURED,
  connectDomain,
  disconnectDomain,
  readState,
  recheckDomain,
} from '@/lib/domain-hosting';
import { forgetHostname } from '@/lib/domain-lookup';
import { hostnamesToAttach, normaliseHostname } from '@/lib/domains';
import { env, isDomainHostingConfigured } from '@/lib/env';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Connecting a domain to a published site.
 *
 * This used to require the owner to connect a Vercel account and deploy the
 * site there first — three technical steps before the one they asked for, and
 * the reason nobody ever reached the end of it. The domain now attaches to
 * Lumen's own deployment, so all the owner needs is a published site and the
 * password to wherever they bought the domain.
 *
 * Buying still goes through the owner's own Vercel account, because buying
 * spends real money and Lumen has nowhere to charge it.
 */

const searchSchema = z.object({
  action: z.literal('search'),
  query: z.string().trim().min(1).max(63),
});

const buySchema = z.object({
  action: z.literal('buy'),
  domain: z.string().trim().toLowerCase().max(253),
  expectedPrice: z.number().positive().max(10_000),
});

/** The project, if it belongs to the caller. RLS makes a hit proof of that. */
async function resolve(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: jsonError('Sign in first', 401) };

  const { data: project } = await supabase
    .from('projects')
    .select('id, public_slug, published_at, custom_domain')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!project) return { error: jsonError('Project not found', 404) };

  return { project, userId: user.id };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const resolved = await resolve(id);
    if ('error' in resolved) return resolved.error;

    if (!resolved.project.custom_domain) return NextResponse.json({ domain: null });
    return NextResponse.json(await readState(id, resolved.project.custom_domain));
  } catch (cause) {
    return handleRouteError(cause);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const resolved = await resolve(id);
    if ('error' in resolved) return resolved.error;

    const raw = await request.json();

    // ---- find a domain to buy -------------------------------------------
    //
    // Searching and buying both run on the owner's own Vercel account. It is
    // their card at the registrar, their renewal and their name on the
    // registration, none of which Lumen is in a position to take on.
    if (raw?.action === 'search' || raw?.action === 'buy') {
      const { credentials } = await loadAccountContext(resolved.userId, 'vercel');
      const token = credentials?.access_token;
      if (!token) {
        return jsonError(
          'Buying a domain needs a Vercel account connected — Settings → Connectors. If you already own a domain, use "I already own one" instead; that needs nothing.',
          409,
        );
      }
      const teamId = credentials.team_id?.trim() || undefined;

      if (raw.action === 'search') {
        const { query } = searchSchema.parse(raw);
        const label = toDomainLabel(query);
        if (!label) return jsonError('Type a name to search for.', 422);

        // Every ending at once; one slow registrar should not hold up the rest.
        const offers = await Promise.all(
          SUGGESTED_TLDS.map((tld) => checkDomain({ token, teamId, domain: `${label}.${tld}` })),
        );
        return NextResponse.json({ label, offers });
      }

      const { domain, expectedPrice } = buySchema.parse(raw);

      // Re-quote immediately before charging. The price the browser sends is
      // not trusted: if it no longer matches Vercel's, nothing is bought.
      const offer = await checkDomain({ token, teamId, domain });
      if (!offer.available) return jsonError('That domain is no longer available.', 409);
      if (offer.price === undefined) {
        return jsonError('Vercel would not quote a price for that domain.', 422);
      }
      if (Math.abs(offer.price - expectedPrice) > 0.01) {
        return jsonError(`The price changed to $${offer.price}. Search again to see the new price.`, 409);
      }

      const bought = await buyDomain({ token, teamId, domain, expectedPrice: offer.price });
      if (!bought.ok) return jsonError(bought.error, 422);

      // Owned now. Connecting it is the same path as any other domain, and a
      // domain bought through Vercel already points at Vercel, so there is
      // usually nothing left for the owner to do.
      if (!resolved.project.published_at || !resolved.project.public_slug) {
        return NextResponse.json(
          { bought: true, domain, error: `You now own ${domain}. Publish the site, then connect it here.` },
          { status: 202 },
        );
      }
      const connected = await connectDomain({ projectId: id, userId: resolved.userId, domain });
      if (!connected.ok) {
        return NextResponse.json({ bought: true, domain, error: connected.error }, { status: 202 });
      }
      for (const hostname of hostnamesToAttach(domain)) forgetHostname(hostname);
      return NextResponse.json({ bought: true, ...connected.state });
    }

    // ---- connect, re-check or remove -------------------------------------
    const action = raw?.action === 'verify' || raw?.action === 'remove' ? raw.action : 'add';
    const domain = normaliseHostname(String(raw?.domain ?? ''));
    if (!domain) return jsonError('That does not look like a domain name.', 422);

    if (action === 'remove') {
      await disconnectDomain(id, domain);
      for (const hostname of hostnamesToAttach(domain)) forgetHostname(hostname);
      return NextResponse.json({ domain: null, removed: true });
    }

    if (!isDomainHostingConfigured) return jsonError(NOT_CONFIGURED, 503);

    // A domain needs a site to answer with. Publishing is one button and it is
    // the step people skip, so the message names it rather than saying no.
    if (!resolved.project.published_at || !resolved.project.public_slug) {
      return jsonError('Publish the site first — a domain needs something to point at.', 409);
    }

    if (action === 'verify') {
      const state = await recheckDomain(id, domain);
      for (const hostname of hostnamesToAttach(domain)) forgetHostname(hostname);
      return NextResponse.json(state);
    }

    // Lumen's own apex would take every customer's traffic with it.
    const canonical = new URL(env.canonicalOrigin).host.replace(/^www\./, '');
    if (domain === canonical || domain.endsWith(`.${canonical}`)) {
      return jsonError('That is Lumen’s own address. Use a domain you own.', 422);
    }

    const connected = await connectDomain({ projectId: id, userId: resolved.userId, domain });
    if (!connected.ok) return jsonError(connected.error, 422);
    for (const hostname of hostnamesToAttach(domain)) forgetHostname(hostname);
    return NextResponse.json(connected.state);
  } catch (cause) {
    return handleRouteError(cause);
  }
}

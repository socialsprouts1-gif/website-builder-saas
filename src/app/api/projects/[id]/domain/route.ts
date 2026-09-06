import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadAccountContext } from '@/lib/connectors/registry';
import {
  SUGGESTED_TLDS,
  addDomain,
  buyDomain,
  checkDomain,
  getDomain,
  removeDomain,
  toDomainLabel,
  verifyDomain,
} from '@/lib/vercel';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

const domainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
      'That does not look like a domain name.',
    )
    .max(253),
  action: z.enum(['add', 'verify', 'remove']).default('add'),
});

/** Buying is its own shape: it carries the price the user agreed to. */
const buySchema = z.object({
  action: z.literal('buy'),
  domain: z.string().trim().toLowerCase().max(253),
  expectedPrice: z.number().positive().max(10_000),
});

const searchSchema = z.object({
  action: z.literal('search'),
  query: z.string().trim().min(1).max(63),
});

/** Resolves the project plus the user's Vercel token, or an error response. */
async function resolve(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: jsonError('Sign in first', 401) };

  // RLS scopes this to the caller, so a hit proves ownership.
  const { data: project } = await supabase
    .from('projects')
    .select('id, vercel_project_id, custom_domain')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return { error: jsonError('Project not found', 404) };

  if (!project.vercel_project_id) {
    return {
      error: jsonError('Deploy this site to Vercel first — a domain needs somewhere to point.', 409),
    };
  }

  const { credentials } = await loadAccountContext(user.id, 'vercel');
  if (!credentials?.access_token) {
    return { error: jsonError('Connect Vercel in Settings → Connectors first.', 409) };
  }

  return {
    project,
    token: credentials.access_token,
    teamId: credentials.team_id?.trim() || undefined,
  };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const resolved = await resolve(id);
    if ('error' in resolved) return resolved.error;

    if (!resolved.project.custom_domain) return NextResponse.json({ domain: null });

    const result = await getDomain({
      token: resolved.token,
      teamId: resolved.teamId,
      projectId: resolved.project.vercel_project_id!,
      domain: resolved.project.custom_domain,
    });

    if (!result.ok) return jsonError(result.error, 422);
    return NextResponse.json(result.data);
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
    const projectId = resolved.project.vercel_project_id!;
    const admin = createAdminClient();

    // ---- find a domain to buy ------------------------------------------
    if (raw?.action === 'search') {
      const { query } = searchSchema.parse(raw);
      const label = toDomainLabel(query);
      if (!label) return jsonError('Type a name to search for.', 422);

      // Every ending is checked at once; one slow registrar should not hold
      // up the rest of the list.
      const offers = await Promise.all(
        SUGGESTED_TLDS.map((tld) =>
          checkDomain({ token: resolved.token, teamId: resolved.teamId, domain: `${label}.${tld}` }),
        ),
      );

      return NextResponse.json({ label, offers });
    }

    // ---- buy one --------------------------------------------------------
    if (raw?.action === 'buy') {
      const { domain, expectedPrice } = buySchema.parse(raw);

      // Re-quote immediately before charging. The price the browser sends is
      // not trusted: if it no longer matches Vercel's, nothing is bought.
      const offer = await checkDomain({
        token: resolved.token,
        teamId: resolved.teamId,
        domain,
      });
      if (!offer.available) return jsonError('That domain is no longer available.', 409);
      if (offer.price === undefined) return jsonError('Vercel would not quote a price for that domain.', 422);
      if (Math.abs(offer.price - expectedPrice) > 0.01) {
        return jsonError(`The price changed to $${offer.price}. Search again to see the new price.`, 409);
      }

      const bought = await buyDomain({
        token: resolved.token,
        teamId: resolved.teamId,
        domain,
        expectedPrice: offer.price,
      });
      if (!bought.ok) return jsonError(bought.error, 422);

      // A domain bought through Vercel already points at Vercel, so attaching
      // it is the last step — there are no records for the user to copy.
      const attached = await addDomain({
        token: resolved.token,
        teamId: resolved.teamId,
        projectId,
        domain,
      });
      if (!attached.ok) {
        return NextResponse.json(
          {
            bought: true,
            domain,
            error: `You now own ${domain}, but attaching it failed: ${attached.error}. Enter it above to connect it.`,
          },
          { status: 202 },
        );
      }

      await admin.from('projects').update({ custom_domain: domain }).eq('id', id);
      return NextResponse.json({ bought: true, ...attached.data });
    }

    const body = domainSchema.parse(raw);

    if (body.action === 'remove') {
      await removeDomain({
        token: resolved.token,
        teamId: resolved.teamId,
        projectId,
        domain: body.domain,
      });
      await admin.from('projects').update({ custom_domain: null }).eq('id', id);
      return NextResponse.json({ domain: null, removed: true });
    }

    const call = body.action === 'verify' ? verifyDomain : addDomain;
    const result = await call({
      token: resolved.token,
      teamId: resolved.teamId,
      projectId,
      domain: body.domain,
    });

    if (!result.ok) return jsonError(result.error, 422);

    await admin.from('projects').update({ custom_domain: body.domain }).eq('id', id);
    return NextResponse.json(result.data);
  } catch (cause) {
    return handleRouteError(cause);
  }
}

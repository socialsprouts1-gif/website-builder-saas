import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadAccountContext } from '@/lib/connectors/registry';
import { addDomain, getDomain, removeDomain, verifyDomain } from '@/lib/vercel';
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

  return { project, token: credentials.access_token };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const resolved = await resolve(id);
    if ('error' in resolved) return resolved.error;

    if (!resolved.project.custom_domain) return NextResponse.json({ domain: null });

    const result = await getDomain({
      token: resolved.token,
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

    const body = domainSchema.parse(await request.json());
    const projectId = resolved.project.vercel_project_id!;
    const admin = createAdminClient();

    if (body.action === 'remove') {
      await removeDomain({ token: resolved.token, projectId, domain: body.domain });
      await admin.from('projects').update({ custom_domain: null }).eq('id', id);
      return NextResponse.json({ domain: null, removed: true });
    }

    const result =
      body.action === 'verify'
        ? await verifyDomain({ token: resolved.token, projectId, domain: body.domain })
        : await addDomain({ token: resolved.token, projectId, domain: body.domain });

    if (!result.ok) return jsonError(result.error, 422);

    await admin.from('projects').update({ custom_domain: body.domain }).eq('id', id);
    return NextResponse.json(result.data);
  } catch (cause) {
    return handleRouteError(cause);
  }
}

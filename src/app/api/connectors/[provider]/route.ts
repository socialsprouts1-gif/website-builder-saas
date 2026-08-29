import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  encodeCredentials,
  getConnector,
  loadAccountContext,
  loadProjectContext,
} from '@/lib/connectors/registry';
import { handleRouteError, jsonError } from '@/lib/api';
import { z } from 'zod';

export const runtime = 'nodejs';

const bodySchema = z.object({
  action: z.enum(['connect', 'disconnect', 'sync']).default('connect'),
  projectId: z.string().uuid().optional(),
  credentials: z.record(z.string().max(4000)).optional(),
  config: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const connector = getConnector(provider);
    if (!connector) return jsonError('Unknown connector', 404);

    const body = bodySchema.parse(await request.json());

    // A project-scoped action must name a project the caller actually owns;
    // RLS on this select is what proves it.
    if (body.projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', body.projectId)
        .maybeSingle();
      if (!project) return jsonError('Project not found', 404);
    }

    const admin = createAdminClient();
    const connectorContext = body.projectId
      ? await loadProjectContext(user.id, body.projectId, provider)
      : await loadAccountContext(user.id, provider);

    if (body.action === 'disconnect') {
      await connector.disconnect?.(connectorContext);
      if (body.projectId) {
        await admin
          .from('connectors_project')
          .delete()
          .eq('project_id', body.projectId)
          .eq('provider', provider);
      } else {
        await admin.from('connectors_account').delete().eq('user_id', user.id).eq('provider', provider);
      }
      return NextResponse.json({ disconnected: true });
    }

    if (body.action === 'sync') {
      if (!connector.sync) return jsonError('This connector has nothing to sync.', 409);
      const result = await connector.sync(connectorContext);
      return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    }

    // connect
    const credentials = { ...(connectorContext.credentials ?? {}), ...(body.credentials ?? {}) };
    const result = await connector.connect({ ...connectorContext, credentials });
    if (!result.ok) return NextResponse.json(result, { status: 422 });

    if (connector.scope === 'project' && body.projectId) {
      await admin.from('connectors_project').upsert(
        {
          project_id: body.projectId,
          provider,
          config: { ...(body.config ?? {}), credentials } as never,
          status: 'enabled',
        },
        { onConflict: 'project_id,provider' },
      );
    } else {
      await admin.from('connectors_account').upsert(
        {
          user_id: user.id,
          provider,
          encrypted_credentials: encodeCredentials(credentials),
          metadata: (body.config ?? {}) as never,
          status: 'connected',
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' },
      );
    }

    return NextResponse.json(result);
  } catch (cause) {
    return handleRouteError(cause);
  }
}

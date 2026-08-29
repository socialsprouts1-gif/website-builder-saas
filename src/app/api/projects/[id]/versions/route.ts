import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revertToVersion } from '@/lib/generation/storage';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/** Revert to an earlier version. History is append-only — nothing is destroyed. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const { versionId } = (await request.json()) as { versionId?: string };
    if (!versionId) return jsonError('Which version?', 422);

    // Confirm the version belongs to this project before restoring it.
    const { data: version } = await supabase
      .from('project_versions')
      .select('id')
      .eq('id', versionId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (!version) return jsonError('Version not found', 404);

    const restored = await revertToVersion(projectId, versionId);
    return NextResponse.json({ versionId: restored.id, versionNumber: restored.version_number });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

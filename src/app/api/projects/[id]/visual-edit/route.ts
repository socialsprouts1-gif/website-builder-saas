import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentFiles, createVersion } from '@/lib/generation/storage';
import { applyTokenEditsToCss, applyVisualEdits, type VisualEdit } from '@/lib/generation/html-edit';
import { visualEditSchema } from '@/lib/validation';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Applies visual-editor changes back into the generated code and saves a new
 * version — never into a separate overlay layer (spec Section 7).
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this select to the caller, so a hit proves ownership.
    const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const body = visualEditSchema.parse(await request.json());
    const edits = body.edits as VisualEdit[];

    const files = await getCurrentFiles(projectId);
    if (files.length === 0) return jsonError('This project has no files yet', 409);

    let applied = 0;
    const next = files.map((file) => {
      if (file.path === body.path && file.path.endsWith('.html')) {
        const result = applyVisualEdits(file.content, edits);
        applied += result.applied;
        return { ...file, content: result.html };
      }
      // Token edits also rewrite the shared stylesheet so they persist site-wide.
      if (file.path.endsWith('.css') && edits.some((edit) => edit.kind === 'token')) {
        return { ...file, content: applyTokenEditsToCss(file.content, edits) };
      }
      return file;
    });

    if (applied === 0) {
      return jsonError('Could not locate those elements in the page. Try reloading the preview.', 409);
    }

    const version = await createVersion({
      projectId,
      files: next,
      source: 'visual_edit',
    });

    return NextResponse.json({ versionId: version.id, appliedEdits: applied });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

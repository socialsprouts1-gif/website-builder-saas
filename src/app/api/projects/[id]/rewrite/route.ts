import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getCurrentFiles, createVersion } from '@/lib/generation/storage';
import { applyVisualEdits } from '@/lib/generation/html-edit';
import { rewriteSection } from '@/lib/generation/rewrite';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 120;

const bodySchema = z.object({
  page: z.string().trim().min(1).max(200),
  lumenId: z.string().trim().min(1).max(200),
  instruction: z.string().trim().max(600).nullable().optional(),
});

/**
 * Rewrites one section and saves it as its own version.
 *
 * Done here rather than queued in the editor because the replacement is markup,
 * and markup the browser supplied must never reach a published page. The
 * browser asks for a section by its id; the server is what decides what that
 * section becomes.
 *
 * Its own version, too: a rewrite is a large change, and it should be one thing
 * to undo rather than something tangled up with whatever else was pending.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this to the caller, so a hit proves ownership.
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const limit = await rateLimitUser(
      user.id,
      `rewrite:${user.id}`,
      RATE_LIMITS.chatEdit.limit,
      RATE_LIMITS.chatEdit.windowSeconds,
    );
    if (!limit.allowed) return jsonError('Too many rewrites in a row. Give it a minute.', 429);

    const body = bodySchema.parse(await request.json());

    const files = await getCurrentFiles(id);
    const file = files.find((candidate) => candidate.path === body.page);
    if (!file) return jsonError('That page is not in this site.', 404);

    const { html } = await rewriteSection({
      projectId: id,
      userId: user.id,
      pageHtml: file.content,
      lumenId: body.lumenId,
      instruction: body.instruction ?? null,
      business: project.name,
      brief: project.description,
    });

    const result = applyVisualEdits(file.content, [
      { kind: 'replace', lumenId: body.lumenId, html },
    ]);
    if (result.applied === 0) return jsonError('That section could not be replaced.', 422);

    const version = await createVersion({
      projectId: id,
      files: files.map((candidate) =>
        candidate.path === body.page ? { ...candidate, content: result.html } : candidate,
      ),
      source: 'visual_edit',
      label: 'Rewrote a section',
    });

    return NextResponse.json({ ok: true, versionId: version.id });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentFiles, createVersion } from '@/lib/generation/storage';
import { applyTokenEditsToCss, applyVisualEdits, type VisualEdit } from '@/lib/generation/html-edit';
import { renderBlock } from '@/lib/generation/blocks';
import { isKnownFontHref } from '@/lib/fonts';
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

    // Block markup is resolved server-side from an id. The client never sends
    // HTML, because whatever it sent would end up inside the published site.
    const edits: VisualEdit[] = [];
    for (const edit of body.edits) {
      if (edit.kind === 'font') {
        // The family is free text, but the stylesheet that loads it is not: only
        // a URL this deployment itself offers may be written into the page.
        if (edit.googleHref && !isKnownFontHref(edit.googleHref)) {
          return jsonError('That font is not one Lumen offers.', 422);
        }
        edits.push(edit as VisualEdit);
        continue;
      }
      if (edit.kind !== 'insert') {
        edits.push(edit as VisualEdit);
        continue;
      }
      const html = renderBlock(edit.blockId, {
        uid: edit.uid,
        imageUrl: edit.imageUrl,
        videoUrl: edit.videoUrl,
      });
      if (!html) return jsonError(`Unknown block: ${edit.blockId}`, 422);
      edits.push({ kind: 'insert', afterLumenId: edit.afterLumenId, html });
    }

    const files = await getCurrentFiles(projectId);
    if (files.length === 0) return jsonError('This project has no files yet', 409);

    let applied = 0;
    const next = files.map((file) => {
      if (file.path === body.path && file.path.endsWith('.html')) {
        const result = applyVisualEdits(file.content, edits);
        applied += result.applied;
        return { ...file, content: result.html };
      }
      // A typeface is a property of the site. Every other page needs its link
      // swapped too, or they load a font the stylesheet no longer asks for.
      if (file.path.endsWith('.html') && edits.some((edit) => edit.kind === 'font')) {
        const fonts = edits.filter((edit) => edit.kind === 'font');
        return { ...file, content: applyVisualEdits(file.content, fonts).html };
      }
      // Token edits rewrite the shared stylesheet so they persist site-wide —
      // and since the generator moved its palette out of the page and into
      // styles.css, that is usually the only place they land. Not counting them
      // is why changing a colour came back as "could not locate those elements".
      if (
        file.path.endsWith('.css') &&
        edits.some((edit) => edit.kind === 'token' || edit.kind === 'font')
      ) {
        const content = applyTokenEditsToCss(file.content, edits);
        if (content !== file.content) applied += 1;
        return { ...file, content };
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

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { renderBlock } from '@/lib/generation/blocks';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * The markup for a section, so the editor can show it before it is saved.
 *
 * Adding a section used to change nothing on screen until you pressed Save,
 * which read as "it did not work" — and it is not how anyone expects an editor
 * to behave. The browser still never authors markup: it asks for the section it
 * chose, renders that in the preview frame, and the save re-renders the same
 * thing from the same id and uid.
 */
const bodySchema = z.object({
  blockId: z.string().min(1).max(60),
  uid: z.string().regex(/^[a-z0-9]{4,12}$/),
  imageUrl: z.string().url().max(2000).optional(),
  videoUrl: z.string().url().max(2000).optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this to the caller, so a hit proves ownership.
    const { data: project } = await supabase.from('projects').select('id').eq('id', id).maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const body = bodySchema.parse(await request.json());
    const html = renderBlock(body.blockId, {
      uid: body.uid,
      imageUrl: body.imageUrl,
      videoUrl: body.videoUrl,
    });
    if (!html) return jsonError(`Unknown section: ${body.blockId}`, 422);

    return NextResponse.json({ html, lumenId: `block-${body.uid}` });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

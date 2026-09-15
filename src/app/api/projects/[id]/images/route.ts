import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSiteImages, imageInstruction } from '@/lib/generation/images';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Makes photographs for this site and hands back the instruction that places
 * them.
 *
 * Two halves on purpose. Generating is slow and costs money; putting the
 * pictures in the page is an ordinary edit, with the streaming, the version and
 * the undo that every other edit gets. So this does the first half and returns
 * the sentence for the second, rather than inventing a private way to write to
 * the site that nothing else uses.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
      .select('id, name, business_type, description')
      .eq('id', id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const limit = await rateLimitUser(
      user.id,
      `images:${user.id}`,
      RATE_LIMITS.generation.limit,
      RATE_LIMITS.generation.windowSeconds,
    );
    if (!limit.allowed) return jsonError('Too many image runs. Give it a few minutes.', 429);

    const images = await generateSiteImages({
      projectId: id,
      userId: user.id,
      business: project.name,
      kind: project.business_type ?? '',
      brief: project.description ?? '',
    });

    if (images.length === 0) {
      return jsonError('No images came back. Your key may not have image generation enabled.', 502);
    }

    return NextResponse.json({ images, instruction: imageInstruction(images) });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

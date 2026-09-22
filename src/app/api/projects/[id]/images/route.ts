import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSiteImages, imageInstruction, unplacedImages } from '@/lib/generation/images';
import { getCurrentFiles, listGeneratedAssets } from '@/lib/generation/storage';
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
      .eq('user_id', user.id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const limit = await rateLimitUser(
      user.id,
      `images:${user.id}`,
      RATE_LIMITS.generation.limit,
      RATE_LIMITS.generation.windowSeconds,
    );
    if (!limit.allowed) return jsonError('Too many image runs. Give it a few minutes.', 429);

    const admin = createAdminClient();

    // Pressing the button is part of the conversation, so it is written down
    // before the slow part starts. It used to live only in the browser's own
    // state: reload during the minute this takes and there was no sign you had
    // ever asked, which read as the button having quietly done nothing.
    await admin
      .from('chat_messages')
      .insert({ project_id: id, role: 'user', content: 'Generate photos for this site' });

    // A written-down request with no written-down answer is its own kind of
    // confusing, so a failure says so in the same place the request went.
    const say = (content: string) =>
      admin.from('chat_messages').insert({ project_id: id, role: 'assistant', content });

    let images;
    try {
      images = await generateSiteImages({
        projectId: id,
        userId: user.id,
        business: project.name,
        kind: project.business_type ?? '',
        brief: project.description ?? '',
      });
    } catch (cause) {
      await say('I could not make the photographs. Nothing on your site was changed.');
      throw cause;
    }

    if (images.length === 0) {
      await say(
        'No photographs came back — the key in use may not have image generation enabled. Nothing on your site was changed.',
      );
      return jsonError('No images came back. Your key may not have image generation enabled.', 502);
    }

    return NextResponse.json({ images, instruction: imageInstruction(images) });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

/**
 * Photographs already made for this project that are not on the site yet.
 *
 * The run itself takes about a minute, and a tab closed during it used to lose
 * every URL it had produced — the pictures stayed in storage, paid for, with
 * nothing pointing at them, and the site went on offering to make more. The
 * bytes were never the fragile part; the list of them was. This reads that list
 * back out of the bucket so the offer after a reload is "put the ones you have
 * in", not "buy another four".
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const [made, files] = await Promise.all([
      listGeneratedAssets(id),
      getCurrentFiles(id).catch(() => []),
    ]);

    const urls = unplacedImages(
      made,
      files.filter((file) => file.path.endsWith('.html')).map((file) => file.content),
    );

    return NextResponse.json({
      images: urls.map((url) => ({ url })),
      instruction: urls.length > 0 ? imageInstruction(urls.map((url) => ({ url }))) : null,
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

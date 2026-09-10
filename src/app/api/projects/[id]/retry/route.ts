import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * Queues a fresh build for a project whose last one never finished.
 *
 * A new job row is created rather than reopening the old one: the old row is
 * the record of what went wrong, and the stream route refuses to re-run a job
 * it has already marked failed.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this select to the caller, so a hit proves ownership.
    const { data: project } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);
    if (project.status === 'generating') {
      return jsonError('That build is already running. Open it to watch.', 409);
    }

    const limit = await rateLimitUser(
      user.id,
      `generation:${user.id}`,
      RATE_LIMITS.generation.limit,
      RATE_LIMITS.generation.windowSeconds,
    );
    if (!limit.allowed) return jsonError('You are generating very fast. Try again shortly.', 429);

    const admin = createAdminClient();
    const { data: previous } = await admin
      .from('generation_jobs')
      .select('prompt_text, screenshot_url, model_used, input_mode')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!previous?.prompt_text) {
      return jsonError('There is nothing to rebuild — start a new site instead.', 409);
    }

    const { data: job, error: jobError } = await admin
      .from('generation_jobs')
      .insert({
        project_id: id,
        user_id: user.id,
        status: 'queued',
        stage: 'queued',
        input_mode: previous.input_mode,
        prompt_text: previous.prompt_text,
        screenshot_url: previous.screenshot_url,
        model_used: previous.model_used,
      })
      .select('id')
      .single();

    if (jobError || !job) return jsonError(jobError?.message ?? 'Could not queue the rebuild', 500);

    await admin.from('projects').update({ status: 'generating' }).eq('id', id);

    return NextResponse.json({ projectId: id, jobId: job.id });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

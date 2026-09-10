import { NextResponse, after, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { claimJob, runJob } from '@/lib/generation/runner';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Starts a build and returns immediately.
 *
 * The work is handed to after(), which keeps the server running it once the
 * response has gone — so the build does not belong to the tab that asked for
 * it. Close the tab, switch pages, shut the laptop: it finishes anyway, and
 * the result is in the database when you come back.
 *
 * Calling this twice is safe. Claiming the job is a conditional update, so the
 * second caller finds nothing queued and is told the build is already running
 * rather than starting a second one.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const job = await claimJob(jobId, user.id);
    if (!job) {
      // Either another tab has it, or it already finished. Both are fine —
      // whatever is watching will read the outcome from the row.
      return NextResponse.json({ started: false, reason: 'not_queued' }, { status: 202 });
    }

    const { data: project } = await createAdminClient()
      .from('projects')
      .select('business_type')
      .eq('id', job.project_id)
      .maybeSingle();

    after(runJob(job, project?.business_type ?? null));

    return NextResponse.json({ started: true }, { status: 202 });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

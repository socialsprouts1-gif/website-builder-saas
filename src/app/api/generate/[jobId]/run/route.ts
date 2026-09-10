import { NextResponse, after, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { claimJob, runNextStep } from '@/lib/generation/runner';
import type { GenerationJobRow } from '@/lib/database.types';
import { env } from '@/lib/env';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 300;

const CONTINUE_HEADER = 'x-lumen-continue';

/**
 * Runs one step of a build, then asks itself to run the next.
 *
 * A whole site does not reliably fit inside one function invocation — the
 * platform stops it at its ceiling, mid-page, with nothing saved. So each step
 * gets its own invocation and its own full budget, and hands its work to the
 * next through the job row.
 *
 * The work is handed to after(), which keeps the server running it once the
 * response has gone, so a build never belongs to the tab that asked for it.
 *
 * A browser starts the chain; every link after that is this route calling
 * itself with a signed token, because a background invocation has no session.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    const admin = createAdminClient();

    const continuing = isSignedContinuation(request, jobId);
    let job: GenerationJobRow | null = null;

    if (continuing) {
      // Mid-chain: the job is already claimed and running, by definition.
      const { data } = await admin
        .from('generation_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('status', 'running')
        .maybeSingle();
      job = (data as GenerationJobRow | null) ?? null;
    } else {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return jsonError('Sign in first', 401);
      job = await claimJob(jobId, user.id);
    }

    if (!job) {
      // Either someone else has it, or it already finished. Both are fine —
      // whatever is watching will read the outcome from the row.
      return NextResponse.json({ started: false, reason: 'not_runnable' }, { status: 202 });
    }

    const { data: project } = await admin
      .from('projects')
      .select('business_type')
      .eq('id', job.project_id)
      .maybeSingle();

    const claimed = job;
    after(
      (async () => {
        const { done } = await runNextStep(claimed, project?.business_type ?? null);
        if (!done) await requestNextStep(jobId);
      })(),
    );

    return NextResponse.json({ started: true }, { status: 202 });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

/**
 * The signature proves the request came from this deployment rather than from
 * anyone who knows a job id. It is derived from the same master key that
 * encrypts stored credentials, so there is no extra secret to configure.
 */
function continuationToken(jobId: string): string | null {
  const key = env.encryptionKey;
  if (!key) return null;
  return createHmac('sha256', key).update(`continue:${jobId}`).digest('hex');
}

function isSignedContinuation(request: NextRequest, jobId: string): boolean {
  const expected = continuationToken(jobId);
  const supplied = request.headers.get(CONTINUE_HEADER);
  if (!expected || !supplied || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

/**
 * Starts the next invocation without waiting for it. Failing to reach
 * ourselves leaves the job running, which the stale sweep settles rather than
 * leaving the user staring at a build that will never move.
 */
async function requestNextStep(jobId: string): Promise<void> {
  const token = continuationToken(jobId);
  if (!token) return;

  try {
    await fetch(`${env.siteUrl}/api/generate/${jobId}/run`, {
      method: 'POST',
      headers: { [CONTINUE_HEADER]: token },
    });
  } catch {
    // The sweep will mark the build stopped, and the user can restart it.
  }
}

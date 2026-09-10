import { NextResponse, after, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { claimJob, readProgress, runNextStep, stepLooksLost } from '@/lib/generation/runner';
import type { GenerationJobRow } from '@/lib/database.types';
import { env } from '@/lib/env';
import { selfOrigin } from '@/lib/self-origin';
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

      // Nothing to claim can also mean a chain link was lost — a step that
      // started, was killed at the platform's ceiling, and told nobody. Only a
      // step that has been silent longer than it could possibly still be alive
      // is picked back up, so a slow step is never run twice.
      if (!job) {
        const { data: running } = await admin
          .from('generation_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', user.id)
          .eq('status', 'running')
          .maybeSingle();

        const candidate = (running as GenerationJobRow | null) ?? null;
        if (candidate && stepLooksLost(readProgress(candidate), candidate.created_at)) {
          job = candidate;
        }
      }
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
    const origin = selfOrigin(request.headers, request.nextUrl.origin || env.siteUrl);
    after(
      (async () => {
        const { done } = await runNextStep(claimed, project?.business_type ?? null);
        if (!done) await requestNextStep(origin, jobId);
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
 * Starts the next invocation. The response is not awaited beyond its headers —
 * that request runs a whole step of its own — but a failure to even reach
 * ourselves is worth one retry before leaving the build for the sweep.
 */
async function requestNextStep(origin: string, jobId: string): Promise<void> {
  const token = continuationToken(jobId);
  if (!token) return;

  const url = `${origin}/api/generate/${jobId}/run`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { [CONTINUE_HEADER]: token } });
      if (response.ok) return;
    } catch {
      // Fall through to the retry.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

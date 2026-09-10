import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readProgress } from '@/lib/generation/runner';
import { reapJob } from '@/lib/generation/reap';
import { sseEncode, sseHeaders } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Watches a build. It runs nothing.
 *
 * The build itself is started by POST ../run and carries on server-side
 * regardless of who is connected, so this only tails the job row and reports
 * what it finds. That is what makes leaving and coming back free: reconnecting
 * costs a database read, never a second generation.
 */

const POLL_MS = 1_200;
const HEARTBEAT_EVERY = 12;

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: exists } = await admin
    .from('generation_jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!exists) return new Response('Not found', { status: 404 });

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return false;
        try {
          controller.enqueue(sseEncode(payload));
          return true;
        } catch {
          closed = true;
          return false;
        }
      };

      // The browser going away must not keep this polling loop alive.
      request.signal.addEventListener('abort', () => {
        closed = true;
      });

      // Keyed on everything the client renders, not just the message: with no
      // progress column the message never changes while the stage does, which
      // left the build screen frozen on its first line.
      let lastSent = '';
      let seenFiles = 0;
      let ticks = 0;

      try {
        while (!closed) {
          const { data: job } = await admin
            .from('generation_jobs')
            .select('status, stage, progress, error, created_at, project_id')
            .eq('id', jobId)
            .maybeSingle();

          if (!job) {
            send({ type: 'error', stage: 'failed', message: 'That build no longer exists.' });
            break;
          }

          const progress = readProgress(job);

          // Only changes are sent, so a slow stage does not spam the client.
          const signature = `${progress.stage}|${progress.message}|${progress.percent}`;
          if (signature !== lastSent) {
            lastSent = signature;
            send({
              type: 'stage',
              stage: progress.stage,
              message: progress.message,
              percent: progress.percent,
              expected: progress.expected,
            });
          }
          for (const path of progress.files.slice(seenFiles)) {
            send({ type: 'file', stage: 'code', path, message: `Writing ${path}` });
          }
          seenFiles = progress.files.length;

          if (job.status === 'succeeded') {
            send({ type: 'done', stage: 'done', percent: 100 });
            break;
          }
          if (job.status === 'failed') {
            send({ type: 'error', stage: 'failed', message: job.error ?? 'Generation failed' });
            break;
          }

          // A build whose chain broke has nothing left to move it. The watcher
          // is the only thing looking, so it is the thing that settles it —
          // otherwise the screen sits on a build that will never finish.
          const abandoned = await reapJob({ id: jobId, createdAt: job.created_at, projectId: job.project_id });
          if (abandoned) {
            send({ type: 'error', stage: 'failed', message: abandoned });
            break;
          }

          ticks += 1;
          if (ticks % HEARTBEAT_EVERY === 0) send({ type: 'ping' });

          await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        }
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed by the client disconnecting */
        }
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runGeneration } from '@/lib/generation/pipeline';
import { sseEncode, sseHeaders } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Runs a queued generation and streams its progress as Server-Sent Events. */
export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: job } = await admin
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!job) return new Response('Not found', { status: 404 });

  // A job that already finished replays its outcome instead of regenerating —
  // reloading the workspace must never cost the user a second generation.
  if (job.status === 'succeeded' || job.status === 'failed') {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          sseEncode(
            job.status === 'succeeded'
              ? { type: 'done', stage: 'done', projectId: job.project_id }
              : { type: 'error', stage: 'failed', message: job.error ?? 'Generation failed' },
          ),
        );
        controller.close();
      },
    });
    return new Response(stream, { headers: sseHeaders() });
  }

  const staleAfter = Date.now() - 6 * 60 * 1000;
  if (job.status === 'running' && new Date(job.created_at).getTime() > staleAfter) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          sseEncode({ type: 'stage', stage: 'code', message: 'Already building in another tab…' }),
        );
        controller.close();
      },
    });
    return new Response(stream, { headers: sseHeaders() });
  }

  const { data: project } = await admin
    .from('projects')
    .select('business_type')
    .eq('id', job.project_id)
    .maybeSingle();

  const businessType = project?.business_type ?? null;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(sseEncode(payload));
        } catch {
          closed = true;
        }
      };

      // Keeps proxies from closing an idle connection during a long model call.
      const heartbeat = setInterval(() => send({ type: 'ping' }), 15_000);

      try {
        await runGeneration(
          {
            jobId,
            projectId: job.project_id,
            userId: user.id,
            prompt: job.prompt_text ?? '',
            businessType,
            screenshotDataUrl: job.screenshot_url,
            requestedModel: job.model_used,
            inputMode: job.input_mode,
          },
          send,
        );
      } catch (cause) {
        send({
          type: 'error',
          stage: 'failed',
          message: cause instanceof Error ? cause.message : 'Generation failed',
        });
      } finally {
        clearInterval(heartbeat);
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

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Marks abandoned builds as failed.
 *
 * Generation runs inside the SSE request that streams it, so it only makes
 * progress while a browser is holding that connection open. Close the tab, lose
 * the network, or let the serverless function hit its ceiling, and the job is
 * left "running" and the project "generating" with nothing left alive to
 * finish or fail them — which is how a site sits there Building for a day.
 *
 * There is no background worker to fix that, so the sweep happens when the
 * owner next looks: cheap, and it can only ever affect their own rows.
 */

/**
 * Generation is capped at 300s by the route's maxDuration. Ten minutes is
 * comfortably past any legitimate run, including a slow model and a retry of
 * the same job in another tab.
 */
const STALE_AFTER_MS = 10 * 60 * 1000;

const ABANDONED_MESSAGE =
  'The build stopped before it finished — the tab was closed or the connection dropped.';

export async function reapStaleJobs(userId: string): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();

  const { data: stale } = await admin
    .from('generation_jobs')
    .select('id, project_id')
    .eq('user_id', userId)
    .in('status', ['queued', 'running'])
    .lt('created_at', cutoff);

  if (!stale || stale.length === 0) return 0;

  await admin
    .from('generation_jobs')
    .update({ status: 'failed', error: ABANDONED_MESSAGE, completed_at: new Date().toISOString() })
    .in(
      'id',
      stale.map((job) => job.id),
    );

  // Only projects still waiting on that job are touched. One that finished by
  // another route, or that the user has since edited, is left alone.
  await admin
    .from('projects')
    .update({ status: 'failed' })
    .eq('user_id', userId)
    .eq('status', 'generating')
    .in(
      'id',
      stale.map((job) => job.project_id),
    );

  return stale.length;
}

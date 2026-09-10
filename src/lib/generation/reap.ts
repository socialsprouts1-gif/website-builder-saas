import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Marks abandoned builds as failed.
 *
 * A build advances by one invocation calling the next. If a link in that chain
 * never lands — the platform dropped it, the network failed — the job is left
 * "running" and the project "generating" with nothing alive to finish or fail
 * them, which is how a site sits there Building for an hour.
 *
 * There is no background worker to fix that, so it is settled by whoever looks
 * next: this sweep on a page load, and reapJob on every poll of a live watcher.
 */

/**
 * A build runs as several invocations, each capped at 300s, chained one after
 * another. Twenty minutes is past any plausible chain — four steps at the full
 * ceiling is twenty — while still surfacing a broken one the same session.
 */
const STALE_AFTER_MS = 20 * 60 * 1000;

const ABANDONED_MESSAGE =
  'The build stopped before it finished — the tab was closed or the connection dropped.';

/**
 * Settles one job if it has been running too long.
 *
 * The sweep below only happens on a page load, which is no help to a tab that
 * has been sitting open watching a build for an hour. The watcher calls this on
 * every poll so a broken build surfaces where someone is actually looking.
 *
 * Returns the failure message when it settled the job, or null when the job is
 * still within its time.
 */
export async function reapJob(job: {
  id: string;
  createdAt: string;
  projectId: string;
}): Promise<string | null> {
  if (Date.now() - new Date(job.createdAt).getTime() < STALE_AFTER_MS) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from('generation_jobs')
    .update({ status: 'failed', error: ABANDONED_MESSAGE, completed_at: new Date().toISOString() })
    .eq('id', job.id)
    .in('status', ['queued', 'running'])
    .select('id')
    .maybeSingle();

  if (!data) return null;

  await admin
    .from('projects')
    .update({ status: 'failed' })
    .eq('id', job.projectId)
    .eq('status', 'generating');

  return ABANDONED_MESSAGE;
}

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

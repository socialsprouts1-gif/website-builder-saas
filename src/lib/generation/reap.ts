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
 * How long a build may go silent before it is presumed dead.
 *
 * Measured from its last sign of life, never from when it started: a step is
 * capped at 300s by the platform, and a rate-limited call can spend another
 * minute backing off inside that, so ten minutes of nothing means nothing is
 * coming. A build still reporting progress is never touched, however long it
 * has been going.
 */
const SILENT_FOR_MS = 10 * 60 * 1000;

const ABANDONED_MESSAGE = 'The build stopped responding and was not able to finish.';

/** The last moment this job showed any sign of life. */
function lastSignOfLife(job: { createdAt: string; progress?: unknown }): number {
  const startedAt = (job.progress as { stepStartedAt?: string } | null)?.stepStartedAt;
  const times = [Date.parse(job.createdAt), startedAt ? Date.parse(startedAt) : Number.NaN];
  return Math.max(...times.filter((value) => !Number.isNaN(value)));
}

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
  progress?: unknown;
  /** What it was doing, so the failure says something useful. */
  stage?: string | null;
}): Promise<string | null> {
  const silentFor = Date.now() - lastSignOfLife(job);
  if (silentFor < SILENT_FOR_MS) return null;

  // Naming the step it died on is what turns a report of "it stopped" into
  // something anyone can act on.
  const note = (job.progress as { chainNote?: string } | null)?.chainNote;
  const message = [
    ABANDONED_MESSAGE,
    job.stage ? `It was on "${job.stage}" with no progress for ${Math.round(silentFor / 60_000)} minutes.` : '',
    // The chain note is the one thing that explains a build that stopped for a
    // reason nobody could otherwise see.
    note ? `The server could not continue it: ${note}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const admin = createAdminClient();
  const { data } = await admin
    .from('generation_jobs')
    .update({ status: 'failed', error: message, completed_at: new Date().toISOString() })
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

  return message;
}

export async function reapStaleJobs(userId: string): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - SILENT_FOR_MS).toISOString();

  const { data: candidates } = await admin
    .from('generation_jobs')
    .select('id, project_id, created_at, progress')
    .eq('user_id', userId)
    .in('status', ['queued', 'running'])
    .lt('created_at', cutoff);

  // created_at only narrows the query; silence is what decides.
  const stale = (candidates ?? []).filter(
    (job) => Date.now() - lastSignOfLife({ createdAt: job.created_at, progress: job.progress }) >= SILENT_FOR_MS,
  );

  if (stale.length === 0) return 0;

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

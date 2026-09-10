import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GenerationJobRow } from '@/lib/database.types';
import { runGeneration } from './pipeline';
import type { GenerationEvent } from './types';

/**
 * Running a build on the server, not in the tab that asked for it.
 *
 * Generation used to happen inside the SSE request that streamed it, which tied
 * the work to one open connection: navigate away and it died; come back and it
 * started over. Now a build is claimed once, run to completion by the server,
 * and reported through the job row — so closing the tab, switching pages, or
 * shutting the laptop makes no difference to whether the site gets built.
 */

export interface JobProgress {
  stage: string;
  message: string;
  files: string[];
  /** Files this build will produce in total, known once the plan lands. */
  expected: number;
  /** 0-100, computed here so every watcher shows the same number. */
  percent: number;
}

const EMPTY: JobProgress = {
  stage: 'queued',
  message: 'Starting up…',
  files: [],
  expected: 0,
  percent: 2,
};

/**
 * Where each stage sits on the bar. Writing the files is most of the wall
 * clock, so it owns most of the range and fills in as files arrive rather than
 * jumping in one step.
 */
const FLOOR: Record<string, number> = {
  queued: 2,
  brief: 8,
  design: 20,
  code: 30,
  persist: 95,
  done: 100,
  failed: 100,
};

const CODE_SPAN = 62;

function computePercent(progress: JobProgress): number {
  const floor = FLOOR[progress.stage] ?? EMPTY.percent;
  if (progress.stage !== 'code' || progress.expected <= 0) return floor;

  // Never quite reaches the top of its band: the last file is not the last of
  // the work, and a bar that sits at 92 then finishes beats one that sits at
  // 100 while the user waits.
  const share = Math.min(progress.files.length / progress.expected, 1);
  return Math.min(FLOOR.code + Math.round(share * CODE_SPAN), FLOOR.persist - 3);
}

/**
 * Takes ownership of a queued job, or returns null if someone already has it.
 *
 * The status check lives in the WHERE clause, so two tabs racing to start the
 * same build resolve in the database: exactly one update matches a queued row,
 * and the loser gets nothing back.
 */
export async function claimJob(jobId: string, userId: string): Promise<GenerationJobRow | null> {
  const { data } = await createAdminClient()
    .from('generation_jobs')
    .update({ status: 'running', stage: 'brief' })
    .eq('id', jobId)
    .eq('user_id', userId)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();

  return (data as GenerationJobRow | null) ?? null;
}

export function readProgress(job: Pick<GenerationJobRow, 'progress' | 'stage'>): JobProgress {
  const raw = job.progress as Partial<JobProgress> | null;
  const progress: JobProgress = {
    stage: raw?.stage ?? job.stage ?? EMPTY.stage,
    message: raw?.message ?? EMPTY.message,
    files: Array.isArray(raw?.files) ? raw.files : [],
    expected: typeof raw?.expected === 'number' ? raw.expected : 0,
    percent: 0,
  };
  // Recomputed on read rather than trusted from the row, so a build written by
  // an older deployment still reports a sane number.
  progress.percent = computePercent(progress);
  return progress;
}

/**
 * Runs the build to completion and keeps the job row current as it goes.
 *
 * Nothing here talks to a browser. Whatever is watching reads the row.
 */
export async function runJob(job: GenerationJobRow, businessType: string | null): Promise<void> {
  const admin = createAdminClient();
  const progress: JobProgress = { ...EMPTY, stage: 'brief', files: [] };

  // Token events are deliberately dropped: they were only ever used to show
  // code streaming past, which no longer appears anywhere.
  const emit = async (event: GenerationEvent) => {
    if (event.type === 'token') return;
    // done and error are written by the pipeline itself, with the outcome.
    if (event.type === 'done' || event.type === 'error') return;

    if (event.stage) progress.stage = event.stage;
    if (event.message) progress.message = event.message;
    if (typeof event.expected === 'number') progress.expected = event.expected;
    if (event.type === 'file' && event.path) {
      progress.stage = 'code';
      if (!progress.files.includes(event.path)) progress.files.push(event.path);
    }
    progress.percent = computePercent(progress);

    await writeProgress(job.id, progress);
  };

  try {
    await runGeneration(
      {
        jobId: job.id,
        projectId: job.project_id,
        userId: job.user_id,
        prompt: job.prompt_text ?? '',
        businessType,
        screenshotDataUrl: job.screenshot_url,
        requestedModel: job.model_used,
        inputMode: job.input_mode,
      },
      emit,
    );
  } catch (cause) {
    // runGeneration marks the job failed itself; this is the belt to that
    // braces, for anything thrown before it got that far.
    const message = cause instanceof Error ? cause.message : 'Generation failed';
    await admin
      .from('generation_jobs')
      .update({ status: 'failed', stage: 'failed', error: message, completed_at: new Date().toISOString() })
      .eq('id', job.id)
      .neq('status', 'succeeded');
    await admin.from('projects').update({ status: 'failed' }).eq('id', job.project_id);
  }
}

/**
 * Progress is decoration, not the build. A deployment whose database predates
 * the progress column still generates correctly — the watcher just falls back
 * to the coarse stage until the migration is run.
 */
async function writeProgress(jobId: string, progress: JobProgress): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('generation_jobs')
    .update({ stage: progress.stage, progress: { ...progress } })
    .eq('id', jobId);

  if (error) {
    await admin.from('generation_jobs').update({ stage: progress.stage }).eq('id', jobId);
  }
}

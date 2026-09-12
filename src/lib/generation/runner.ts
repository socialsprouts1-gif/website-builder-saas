import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GenerationJobRow } from '@/lib/database.types';
import { nextStep, runBuildStep, type BuildState, type BuildStep } from './pipeline';

/**
 * Running a build on the server, not in the tab that asked for it.
 *
 * Generation used to happen inside the SSE request that streamed it, which tied
 * the work to one open connection: navigate away and it died; come back and it
 * started over. Now a build is claimed once, run by the server, and reported
 * through the job row — so closing the tab, switching pages, or shutting the
 * laptop makes no difference to whether the site gets built.
 *
 * It also runs as four separate invocations rather than one. A whole site does
 * not reliably fit inside a serverless function's time limit, and a build that
 * dies at the ceiling loses everything it had written. Each step now gets its
 * own full budget and hands its work to the next through the job row.
 */

export interface JobProgress {
  stage: string;
  message: string;
  files: string[];
  /** When the current step began, so a lost chain link can be spotted. */
  stepStartedAt?: string;
  /** True once the site is viewable, even while more pages are being added. */
  published?: boolean;
  /** Why the build could not continue itself, when that happened. */
  chainNote?: string;
  /** How many pages have been rendered into files so far. */
  saved: number;
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
  saved: 0,
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

/**
 * How long a step may go silent before it is presumed lost.
 *
 * A step is one small JSON call now, not a whole page of HTML, so ninety
 * seconds of silence means something has gone wrong rather than that the model
 * is being thorough. Picking a live step back up costs one duplicated call and
 * nothing else — both writers compute the same remaining queue — where waiting
 * six minutes cost the user six minutes.
 */
export const STEP_TIMEOUT_MS = 90 * 1000;

/** True when the current step has gone quiet for longer than it could live. */
export function stepLooksLost(progress: JobProgress, jobCreatedAt: string): boolean {
  const since = progress.stepStartedAt ?? jobCreatedAt;
  return Date.now() - new Date(since).getTime() > STEP_TIMEOUT_MS;
}

/** The build's working state, parked in the job row between steps. */
export function readBuildState(job: Pick<GenerationJobRow, 'progress'>): BuildState {
  const raw = job.progress as { build?: BuildState } | null;
  return raw?.build ?? {};
}

export function readProgress(job: Pick<GenerationJobRow, 'progress' | 'stage'>): JobProgress {
  const raw = job.progress as Partial<JobProgress> | null;
  const progress: JobProgress = {
    stage: raw?.stage ?? job.stage ?? EMPTY.stage,
    message: raw?.message ?? EMPTY.message,
    files: Array.isArray(raw?.files) ? raw.files : [],
    expected: typeof raw?.expected === 'number' ? raw.expected : 0,
    saved: typeof raw?.saved === 'number' ? raw.saved : 0,
    percent: 0,
    stepStartedAt: typeof raw?.stepStartedAt === 'string' ? raw.stepStartedAt : undefined,
    published: raw?.published === true,
    chainNote: typeof raw?.chainNote === 'string' ? raw.chainNote : undefined,
  };
  // Recomputed on read rather than trusted from the row, so a build written by
  // an older deployment still reports a sane number.
  progress.percent = computePercent(progress);
  return progress;
}

/**
 * Runs exactly one step of a build, then says whether another is due.
 *
 * Nothing here talks to a browser. Whatever is watching reads the job row.
 */
export async function runNextStep(
  job: GenerationJobRow,
  businessType: string | null,
): Promise<{ done: boolean; failed: boolean }> {
  const admin = createAdminClient();
  const before = readProgress(job);
  const state = readBuildState(job);
  const step = nextStep(state);
  if (!step) return { done: true, failed: false };

  const files = [...before.files];
  let expected = before.expected;
  const stepStartedAt = new Date().toISOString();

  // Written before any model call, so a step that never reports again can be
  // told apart from one that is merely slow.
  await writeState(job.id, { ...before, stepStartedAt, build: state });

  const emitFile = (path: string) => {
    if (files.includes(path)) return;
    files.push(path);
    // Fire and forget: a file line arriving late is better than the build
    // waiting on a database write to report it.
    void writeState(job.id, {
      ...before,
      stage: 'code',
      message: `Writing ${path}`,
      files,
      expected,
      percent: 0,
      stepStartedAt,
      build: state,
    });
  };

  try {
    const outcome = await runBuildStep(step, state, {
      input: {
        jobId: job.id,
        projectId: job.project_id,
        userId: job.user_id,
        prompt: job.prompt_text ?? '',
        businessType,
        screenshotDataUrl: job.screenshot_url,
        requestedModel: job.model_used,
        inputMode: job.input_mode,
      },
      emitFile,
      say: (message: string) => {
        void writeState(job.id, {
          ...before,
          message,
          files,
          expected,
          stepStartedAt,
          build: state,
        });
      },
    });

    if (typeof outcome.expected === 'number') expected = outcome.expected;

    await writeState(job.id, {
      ...before,
      stage: outcome.stage,
      message: outcome.message,
      files,
      expected,
      percent: 0,
      stepStartedAt,
      published: outcome.published ?? before.published,
      // Every save bumps this, which is how the watching tab knows a new page
      // exists and reloads the preview instead of showing the first save until
      // the build ends.
      saved: outcome.state.savedPages?.length ?? before.saved,
      build: outcome.state,
    });

    if (outcome.next === null) {
      await admin
        .from('generation_jobs')
        .update({ status: 'succeeded', stage: 'done', completed_at: new Date().toISOString() })
        .eq('id', job.id);
      return { done: true, failed: false };
    }

    return { done: false, failed: false };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Generation failed';
    await admin
      .from('generation_jobs')
      .update({
        status: 'failed',
        stage: 'failed',
        error: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .neq('status', 'succeeded');
    await admin.from('projects').update({ status: 'failed' }).eq('id', job.project_id);
    return { done: true, failed: true };
  }
}

/**
 * Progress is decoration, not the build. A deployment whose database predates
 * the progress column still generates correctly — the watcher just falls back
 * to the coarse stage until the migration is run.
 */
async function writeState(
  jobId: string,
  progress: JobProgress & { build: BuildState },
): Promise<void> {
  const admin = createAdminClient();
  const payload = { ...progress, percent: computePercent(progress) };

  const { error } = await admin
    .from('generation_jobs')
    .update({ stage: payload.stage, progress: payload as never })
    .eq('id', jobId);

  if (error) {
    // Without the column the build still runs; only the fine-grained report is
    // lost, and the watcher falls back to the coarse stage.
    await admin.from('generation_jobs').update({ stage: payload.stage }).eq('id', jobId);
  }
}

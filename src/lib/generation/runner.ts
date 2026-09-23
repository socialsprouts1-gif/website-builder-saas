import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GenerationJobRow } from '@/lib/database.types';
import { nextStep, runBuildStep, type BuildState, type BuildStep } from './pipeline';
import { logError, noteError } from '@/lib/errors';

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
 * How long a step may go SILENT before it is presumed lost.
 *
 * Silent, not "running": stepStartedAt is refreshed by every write a step
 * makes, including a heartbeat on a timer, so this measures how long nothing
 * has been heard rather than how long the step has been going.
 *
 * That distinction is the whole fix. This was ninety seconds against a step
 * that was one small JSON call, on the reasoning that picking a live step back
 * up cost one duplicated call. A step became a whole page of sections written
 * together, which takes longer than ninety seconds — so the browser's thirty
 * second nudge started a second runner on the same page, then a third, each
 * writing the queue back over the last one's work. That is a build that says
 * "writing courses" for two hours and never gets to the next page.
 */
export const STEP_TIMEOUT_MS = 180 * 1000;

/** How often a running step says it is still alive. */
export const HEARTBEAT_MS = 25 * 1000;

/** True when the current step has said nothing for longer than it should. */
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

  /**
   * Every write to the job row, in the order it was asked for.
   *
   * They used to be fire-and-forget, and each one carried the build state as it
   * was when the step began. So a progress line issued a moment before the step
   * finished could land a moment after it — putting the queue back to where it
   * started, and running the same page again. Forever. Chaining them means the
   * write that finishes a step is always the last word on it.
   */
  let latest: JobProgress & { build: BuildState } = {
    ...before,
    stepStartedAt: new Date().toISOString(),
    build: state,
  };
  let writes: Promise<void> = Promise.resolve();

  const commit = (patch: Partial<JobProgress & { build: BuildState }>): Promise<void> => {
    // Refreshed on every write, which is what makes stepStartedAt a heartbeat
    // rather than a start time.
    latest = { ...latest, ...patch, stepStartedAt: new Date().toISOString() };
    const snapshot = { ...latest, files: [...latest.files] };
    writes = writes.then(() => writeState(job.id, snapshot)).catch((cause) => {
      // A lost progress line must never be the reason a build stops — but it
      // is how a build goes quiet, so it is written down.
      noteError({ scope: 'generation.progress', error: cause, projectId: job.project_id });
    });
    return writes;
  };

  // Written before any model call, so a step that never reports again can be
  // told apart from one that is merely slow.
  await commit({});

  // Says "still here" while a long step is thinking. Without it a page that
  // takes longer than the timeout gets a second runner started on top of it.
  const heartbeat = setInterval(() => void commit({}), HEARTBEAT_MS);

  const emitFile = (path: string) => {
    if (files.includes(path)) return;
    files.push(path);
    void commit({ stage: 'code', message: `Writing ${path}`, files: [...files], expected });
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
        blueprintId: job.blueprint_id,
      },
      emitFile,
      say: (message: string) => void commit({ message, files: [...files], expected }),
    });

    if (typeof outcome.expected === 'number') expected = outcome.expected;

    clearInterval(heartbeat);

    // Awaited, and therefore last: every progress line queued above has been
    // applied before this one, so the state that ends the step is the state
    // the next step reads.
    await commit({
      stage: outcome.stage,
      message: outcome.message,
      files: [...files],
      expected,
      published: outcome.published ?? latest.published,
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
    clearInterval(heartbeat);
    const message = cause instanceof Error ? cause.message : 'Generation failed';
    await logError({
      scope: 'generation.step',
      error: cause,
      userId: job.user_id,
      projectId: job.project_id,
      detail: { step, files: files.length, expected },
    });
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
    noteError({ scope: 'generation.writeState', error, detail: { jobId, stage: payload.stage } });
  }
}

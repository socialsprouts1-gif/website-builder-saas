/**
 * What the workspace should show the moment it opens.
 *
 * This existed inline, spread across six `useState` initialisers, and it was
 * wrong in a way that only showed up mid-build. Two facts were being conflated:
 * the *project's* status and the *build's* status. Every page a build saves
 * calls `createVersion`, which flips the project to `ready` — so a build that
 * is a third of the way through leaves a project row saying `ready` while the
 * job row still says `running`. Reading the project row alone, the workspace
 * decided the build was over, hid the "still writing the rest" line, and
 * offered to build pages that were at that moment being built.
 *
 * So the job decides whether anything is running, and the project decides
 * whether there is a site to look at. They are different questions.
 */

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | null;

export interface OpeningView {
  /** Open the build watcher — there is a build in flight to follow. */
  watch: boolean;
  /** There is a site saved, so show it rather than the build screen. */
  ready: boolean;
  /** Something is running; the files are not ours to edit. */
  busy: boolean;
  /** The site is viewable and the build is still adding to it. */
  stillAdding: boolean;
  /** A build that ended without finishing, with nothing left to move it. */
  stopped: boolean;
}

export function isRunning(jobStatus: JobStatus): boolean {
  return jobStatus === 'queued' || jobStatus === 'running';
}

export function openingView(input: {
  projectStatus: string;
  jobStatus: JobStatus;
}): OpeningView {
  const running = isRunning(input.jobStatus);
  const ready = input.projectStatus === 'ready';

  return {
    watch: running,
    ready,
    busy: running,
    // A live site with a live build behind it. This is the state a reload
    // during a build lands in, and the one that used to read as "finished".
    stillAdding: running && ready,
    // Only when nothing is running and there is nothing to show. A failed job
    // on a project that already has a site is not a dead end — the site is
    // right there.
    stopped: !running && !ready && (input.projectStatus === 'failed' || input.jobStatus === 'failed'),
  };
}

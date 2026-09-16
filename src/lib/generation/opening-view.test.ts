import { describe, expect, it } from 'vitest';
import { openingView } from './opening-view';

describe('openingView', () => {
  it('watches a queued build and shows the build screen', () => {
    expect(openingView({ projectStatus: 'generating', jobStatus: 'queued' })).toEqual({
      watch: true,
      ready: false,
      busy: true,
      stillAdding: false,
      stopped: false,
    });
  });

  /**
   * The bug this file exists for.
   *
   * Every page a build saves flips the project row to `ready`, so half way
   * through a build the two rows disagree. Reading the project alone, the
   * workspace called the build finished, stopped watching it, and offered to
   * build the pages it was in the middle of writing.
   */
  it('treats a ready project with a running job as still being added to', () => {
    const view = openingView({ projectStatus: 'ready', jobStatus: 'running' });
    expect(view.watch).toBe(true);
    expect(view.ready).toBe(true);
    expect(view.stillAdding).toBe(true);
    expect(view.stopped).toBe(false);
  });

  it('is finished only once the job is', () => {
    const view = openingView({ projectStatus: 'ready', jobStatus: 'succeeded' });
    expect(view).toEqual({
      watch: false,
      ready: true,
      busy: false,
      stillAdding: false,
      stopped: false,
    });
  });

  it('does not watch a project with no job', () => {
    expect(openingView({ projectStatus: 'ready', jobStatus: null }).watch).toBe(false);
  });

  it('offers a restart when a build failed before saving anything', () => {
    expect(openingView({ projectStatus: 'failed', jobStatus: 'failed' }).stopped).toBe(true);
    expect(openingView({ projectStatus: 'failed', jobStatus: null }).stopped).toBe(true);
  });

  /** A site that exists is never a dead end, whatever the last job did. */
  it('does not show the stopped screen when there is a site to look at', () => {
    expect(openingView({ projectStatus: 'ready', jobStatus: 'failed' }).stopped).toBe(false);
  });
});

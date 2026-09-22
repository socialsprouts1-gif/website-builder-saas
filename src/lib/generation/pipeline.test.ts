import { describe, expect, it } from 'vitest';
import { nextStep, pagesToWrite, SECTION_CONCURRENCY, fileLabel, type BuildState } from './pipeline';
import { VERTICALS, DEFAULT_VERTICAL, verticalBySlug } from './verticals';
import type { Section, SectionKind } from './kit/sections';

/**
 * How a build advances.
 *
 * This is the file that cost the most. A build once looped on one page for two
 * hours, and twice it ended silently with pages missing — both times because
 * what ran next and what the runner expected had drifted apart. The simulation
 * below is the cheap version of finding that out.
 */

type Job = { page: string; index: number; kind: SectionKind };
/** A site, as the pages it has and the sections on each. */
type Shape = [string, SectionKind[]][];

const queueFor = (pages: Shape): Job[] =>
  pages.flatMap(([page, kinds]) => kinds.map((kind, index) => ({ page, index, kind })));

/**
 * Runs a whole build the way the runner does, and reports what it took.
 *
 * Deliberately a re-implementation of the loop rather than a mock of it: what
 * is being checked is that `nextStep` and the step that runs agree, so the
 * agreement has to be exercised, not stubbed.
 */
function build(pages: Shape) {
  const queue = queueFor(pages);
  let state: BuildState = { plan: {} as never, sections: {}, queue, published: false, savedPages: [] };
  let step = nextStep(state);
  let rounds = 0;
  let saves = 0;

  for (let guard = 0; step && guard < 500; guard += 1) {
    if (step === 'section') {
      const batch: Job[] = [];
      for (const entry of state.queue ?? []) {
        if (batch.length >= SECTION_CONCURRENCY && entry.page !== batch[batch.length - 1].page) break;
        batch.push(entry);
      }
      const taken = new Set(batch.map((entry) => entry.page));
      const sections = { ...(state.sections ?? {}) };
      for (const job of batch) sections[`${job.page}#${job.index}`] = {} as never;
      state = { ...state, sections, queue: (state.queue ?? []).filter((e) => !taken.has(e.page)) };
      rounds += 1;
    } else if (step === 'publish') {
      const written = [
        ...new Set(Object.keys(state.sections ?? {}).map((key) => key.slice(0, key.lastIndexOf('#')))),
      ];
      const pending = new Set((state.queue ?? []).map((entry) => entry.page));
      state = { ...state, published: true, savedPages: written.filter((page) => !pending.has(page)) };
      saves += 1;
    }
    step = nextStep(state);
  }

  return { state, rounds, saves, finished: step === null, sections: queue.length };
}

describe('nextStep', () => {
  it('plans before anything else', () => {
    expect(nextStep({})).toBe('plan');
  });

  // The rule that used to be "published and nothing queued", which threw away
  // every page written after the homepage.
  it('saves a finished page even though it has already published once', () => {
    const state: BuildState = {
      plan: {} as never,
      queue: [],
      sections: { 'about.html#0': {} as never },
      savedPages: ['index.html'],
      published: true,
    };
    expect(nextStep(state)).toBe('publish');
  });

  it('stops only when everything written has been saved', () => {
    const state: BuildState = {
      plan: {} as never,
      queue: [],
      sections: { 'index.html#0': {} as never },
      savedPages: ['index.html'],
      published: true,
    };
    expect(nextStep(state)).toBeNull();
  });
});

describe('a whole build', () => {
  const shapes: [string, Shape][] = [...VERTICALS, DEFAULT_VERTICAL].map((vertical) => [
    vertical.slug,
    vertical.pages.map((page) => [page.path, page.sections] as [string, SectionKind[]]),
  ]);

  it.each(shapes)('%s finishes, with every page saved', (_slug, pages) => {
    const result = build(pages);

    expect(result.finished).toBe(true);
    expect(result.state.queue).toEqual([]);
    expect(Object.keys(result.state.sections ?? {})).toHaveLength(result.sections);
    // Every page that has sections to wait for. A shop's basket and checkout
    // have none — what goes on them is rendered from the database when they
    // are served — so they never enter the queue this simulates. That they are
    // still written is `pagesToWrite`'s job, and is checked there.
    for (const [path, kinds] of pages) {
      if (kinds.length > 0) expect(result.state.savedPages).toContain(path);
    }
  });

  it.each(shapes)('%s writes in a handful of rounds, not one per section', (_slug, pages) => {
    const result = build(pages);
    // Sixteen serial calls became two parallel rounds. If this ever climbs back
    // towards the section count, the batching has been undone.
    expect(result.rounds).toBeLessThanOrEqual(4);
    expect(result.rounds).toBeLessThan(result.sections / 4);
  });

  it('saves as it goes, so pages appear before the build ends', () => {
    // Big enough to need more than one round. A small site fits in a single
    // batch and publishes once, which is correct and is why this is not
    // asserted on the four-section case.
    const result = build([
      ['index.html', ['hero', 'features', 'services', 'gallery', 'stats', 'testimonials', 'cta']],
      ['about.html', ['hero', 'about', 'team', 'stats']],
      ['contact.html', ['hero', 'contact', 'hours', 'faq', 'cta']],
    ]);
    expect(result.rounds).toBeGreaterThan(1);
    expect(result.saves).toBeGreaterThan(1);
  });

  it('never splits a page across two rounds', () => {
    // A page half-written is a page that publishes half-finished.
    const result = build([['index.html', Array.from({ length: 12 }, () => 'hero' as SectionKind)]]);
    expect(result.rounds).toBe(1);
  });
});

describe('fileLabel', () => {
  it('names files the way a person would', () => {
    expect(fileLabel('index.html')).toBe('the Home page');
    expect(fileLabel('about.html')).toBe('the About page');
    expect(fileLabel('styles.css')).toBe('the stylesheet');
    expect(fileLabel('script.js')).toBe('the page scripts');
  });
});

/**
 * Which pages become files.
 *
 * Split out from the build simulation above because it answers a different
 * question: not "does the queue drain", but "does a page that is waiting on
 * nothing ever get written". A shop's basket is exactly that page, and before
 * this rule existed it would have waited for sections that were never coming.
 */
describe('pagesToWrite', () => {
  const retail = verticalBySlug('retail')!;
  const section = {} as Section;

  it('writes nothing at all before the first section lands', () => {
    expect(pagesToWrite(retail, {})).toEqual([]);
  });

  it('writes the basket and the checkout as soon as the site has anything', () => {
    const paths = pagesToWrite(retail, { 'index.html#0': section }).map((page) => page.path);
    expect(paths).toContain('index.html');
    expect(paths).toContain('cart.html');
    expect(paths).toContain('checkout.html');
  });

  /** A nav entry to a page that does not exist is a dead link. */
  it('still waits for a page that has real sections coming', () => {
    const paths = pagesToWrite(retail, { 'index.html#0': section }).map((page) => page.path);
    expect(paths).not.toContain('about.html');
    expect(paths).not.toContain('contact.html');
  });

  it('never writes a shop page for a business with no shop', () => {
    const clinic = verticalBySlug('clinic')!;
    const paths = pagesToWrite(clinic, { 'index.html#0': section }).map((page) => page.path);
    expect(paths).toEqual(['index.html']);
  });
});

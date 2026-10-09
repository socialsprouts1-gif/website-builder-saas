import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROJECT_TABS, nextStepFor, projectTabs } from '@/components/app/project-nav';

/**
 * The parts of the app whose only job is telling somebody what to do next.
 *
 * Every one of these has failed by being written and then not connected. The
 * chatbot index step existed for weeks and was called from nothing. The
 * first-run explanation was written, typechecked, linted, and imported
 * nowhere — which looks exactly like finished work and ships as nothing at
 * all. A component that explains the product is worthless if it is not
 * mounted, and that is a fact about the source, so it is checked here.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const firstRun = read('src/components/app/FirstRun.tsx');
const appLayout = read('src/app/app/layout.tsx');
const nav = read('src/components/app/AppNav.tsx');
const tabs = read('src/components/app/ProjectTabs.tsx');
const projectLayout = read('src/app/app/project/[id]/layout.tsx');

describe('the first-run explanation', () => {
  it('is mounted in the app shell', () => {
    expect(appLayout).toContain("from '@/components/app/FirstRun'");
    expect(appLayout).toMatch(/<FirstRun\s*\/>/);
  });

  it('can be opened again from the nav', () => {
    expect(nav).toContain('FirstRunButton');
  });

  /**
   * It must not be open on the first render. There is no localStorage on the
   * server, so a panel that starts open renders for everybody — including the
   * person who dismissed it yesterday — and then disappears a frame later.
   */
  it('opens from an effect rather than from its initial state', () => {
    expect(firstRun).toContain('useState(false)');
    expect(firstRun).toMatch(/useEffect\(\(\) => \{/);
  });

  it('remembers that it has been seen', () => {
    expect(firstRun).toContain("localStorage.setItem(SEEN, '1')");
  });

  /** Steps numbered 1..n, in order, each with a sentence worth reading. */
  it('reads as a numbered sequence', () => {
    const numbers = [...firstRun.matchAll(/n: '(\d+)'/g)].map(([, n]) => Number(n));
    expect(numbers.length).toBeGreaterThanOrEqual(5);
    expect(numbers).toEqual(numbers.map((_, index) => index + 1));

    const bodies = [...firstRun.matchAll(/body:\s*'([^']+)'/g)].map(([, body]) => body);
    expect(bodies).toHaveLength(numbers.length);
    for (const body of bodies) expect(body.length).toBeGreaterThan(60);
  });

  it('only links pages that exist', () => {
    for (const [, href] of firstRun.matchAll(/href="(\/[^"]*)"/g)) {
      const base = join(process.cwd(), 'src/app', href.replace(/^\//, ''));
      expect(existsSync(join(base, 'page.tsx')), `${href} has no page.tsx`).toBe(true);
    }
  });
});

describe('the project tabs', () => {
  const keys = PROJECT_TABS.map((tab) => tab.key);

  it('is the order somebody uses them in', () => {
    expect(keys[0]).toBe('workspace');
    expect(keys.at(-1)).toBe('deploy');
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every tab is a page that exists', () => {
    for (const tab of projectTabs('abc')) {
      const route = tab.href.replace('/app/project/abc', '');
      const base = join(process.cwd(), 'src/app/app/project/[id]', route.replace(/^\//, ''));
      expect(existsSync(join(base, 'page.tsx')), `${tab.href} has no page.tsx`).toBe(true);
    }
  });

  /**
   * Seven words in a row at one size was the complaint. Each tab carries a
   * mark as well, and a tab missing from ICONS renders as a word again while
   * the six beside it have pictures — which reads as a bug, not a gap.
   */
  it.each(keys.map((key) => [key]))('%s has an icon', (key) => {
    expect(new RegExp(`^  ${key}: Mark\\(`, 'm').test(tabs), `ICONS has no ${key}`).toBe(true);
  });

  it('builds its hrefs under the project', () => {
    expect(projectTabs('xyz')[0].href).toBe('/app/project/xyz');
    expect(projectTabs('xyz').find((tab) => tab.key === 'editor')?.href).toBe(
      '/app/project/xyz/editor',
    );
  });
});

describe('the arrow pointing at the next step', () => {
  it('points nowhere while the site is still being built', () => {
    expect(nextStepFor({ status: 'building', publicSlug: null })).toBeUndefined();
    expect(nextStepFor({ status: 'draft', publicSlug: null })).toBeUndefined();
    expect(nextStepFor({ status: null, publicSlug: null })).toBeUndefined();
  });

  it('points at the editor once there is a site to change', () => {
    expect(nextStepFor({ status: 'ready', publicSlug: null })).toBe('editor');
  });

  it('points nowhere once it is published', () => {
    expect(nextStepFor({ status: 'ready', publicSlug: 'rani-sarees' })).toBeUndefined();
  });

  it('only ever names a real tab', () => {
    const keys = PROJECT_TABS.map((tab) => tab.key);
    const states = [
      { status: 'ready', publicSlug: null },
      { status: 'ready', publicSlug: 'x' },
      { status: 'building', publicSlug: null },
    ];
    for (const state of states) {
      const step = nextStepFor(state);
      if (step) expect(keys, `nextStep '${step}' is not a tab`).toContain(step);
    }
  });

  /** One dot, or none. A dot on every tab is a dot on none of them. */
  it('never points at the tab you are already on', () => {
    expect(tabs).toContain('nextStep === tab.key && !active');
  });
});

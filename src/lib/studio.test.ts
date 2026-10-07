import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FEATURES, planFor } from '@/lib/plans';
import { blueprintById, blueprintIsThreeD } from '@/lib/templates';
import {
  STUDIO_CATEGORIES,
  STUDIO_KINDS,
  STUDIO_PALETTES,
  STUDIO_CONTROLS,
  STUDIO_EDITOR_PANELS,
  STUDIO_EXAMPLES,
  STUDIO_SHOWCASE,
  STUDIO_STEPS,
  STUDIO_TIMELINE,
  STUDIO_TIMELINE_SECONDS,
} from './studio';

describe('the Studio catalogue', () => {
  it('has the eight kinds of experience, each drawn differently', () => {
    expect(STUDIO_CATEGORIES).toHaveLength(8);
    const shapes = new Set(STUDIO_CATEGORIES.map((entry) => entry.shape));
    // Eight identical illustrations would make eight categories read as one.
    expect(shapes.size).toBe(8);
    expect(new Set(STUDIO_CATEGORIES.map((entry) => entry.id)).size).toBe(8);
  });

  it('gives every worked example its own palette', () => {
    expect(STUDIO_EXAMPLES).toHaveLength(6);
    const tints = new Set(STUDIO_EXAMPLES.map((entry) => entry.tint.join()));
    expect(tints.size).toBe(6);
    for (const example of STUDIO_EXAMPLES) {
      for (const colour of example.tint) expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('shows the whole editor, not a suggestion of one', () => {
    expect(STUDIO_EDITOR_PANELS.length).toBeGreaterThanOrEqual(11);
    expect(STUDIO_CONTROLS.length).toBeGreaterThanOrEqual(13);
    expect(new Set(STUDIO_CONTROLS.map((entry) => entry.label)).size).toBe(STUDIO_CONTROLS.length);
  });

  it('numbers the four steps in order', () => {
    expect(STUDIO_STEPS.map((step) => step.number)).toEqual(['01', '02', '03', '04']);
  });

  it('covers the showcase categories asked for', () => {
    const categories = STUDIO_SHOWCASE.map((project) => project.category);
    for (const wanted of [
      '3D Commerce',
      'Digital Art',
      'Automotive',
      'Gaming',
      'Architecture',
      'Luxury',
      'Technology',
      'Entertainment',
    ]) {
      expect(categories, wanted).toContain(wanted);
    }
  });
});

describe('the animation timeline', () => {
  it('keeps every clip inside the five seconds it draws', () => {
    for (const track of STUDIO_TIMELINE) {
      for (const [start, end] of track.clips) {
        expect(start, track.label).toBeGreaterThanOrEqual(0);
        expect(end, track.label).toBeGreaterThan(start);
        expect(end, track.label).toBeLessThanOrEqual(STUDIO_TIMELINE_SECONDS);
      }
    }
  });

  /**
   * A timeline where every track is one bar of the same length is a picture of
   * a timeline. The clips have to overlap and stagger or the section is
   * decoration rather than a preview of the tool.
   */
  it('staggers the tracks rather than drawing six identical bars', () => {
    const starts = new Set(STUDIO_TIMELINE.map((track) => track.clips[0][0]));
    expect(starts.size).toBeGreaterThan(3);
    expect(STUDIO_TIMELINE.some((track) => track.clips.length > 1)).toBe(true);
  });
});

describe('what the page promises', () => {
  const sources = globSync('src/{app,components}/**/*.tsx', { cwd: process.cwd() })
    .map((path) => path.replace(/\\/g, '/'))
    .filter((path) => path.includes('studio') || path.includes('Studio'));

  const text = sources.map((path) => readFileSync(join(process.cwd(), path), 'utf8')).join('\n');

  it('finds the Studio screens it is checking', () => {
    expect(sources.length).toBeGreaterThanOrEqual(5);
  });

  /**
   * The one that matters, now pointing the other way.
   *
   * Studio spent a release as a convincing showcase for something that did not
   * exist, and every screen had to say so. It exists: the blueprints build,
   * the scenes render, Build posts to the same endpoint as everything else. So
   * the risk has inverted — a screen still saying "in development" is now
   * turning away the people the Premium plan is for, and a stale sentence in
   * one of eight components is exactly the kind of thing nobody re-reads.
   */
  it('no longer says the feature is unbuilt', () => {
    expect(FEATURES.three_d.soon).toBeFalsy();
    expect(text).not.toMatch(/in development|still being built|not built yet|coming soon/i);
    // "opens to Premium first" was the queue copy, and it reads as a wait list.
    expect(text).not.toMatch(/opens to Premium (accounts )?first/i);
  });

  /**
   * And every screen still has to say which plan it is on. A feature that
   * silently 403s at the last press is worse than one that never offered.
   */
  it('says on every screen which plan it is on', () => {
    for (const path of sources) {
      const source = readFileSync(join(process.cwd(), path), 'utf8');
      const says = /STUDIO_STATUS|Premium/i.test(source);
      // A part with no copy of its own — a scene, a grid — is labelled by the
      // page around it rather than labelling itself.
      const silent = !/<h1|<h2|font-display text-\[3/.test(source);
      expect(says || silent, `${path} describes the feature without naming the plan`).toBe(true);
    }
  });

  /**
   * Every kind offered has to be a blueprint that exists. This is the join
   * between the screen and the thing it builds, and it is one string: a
   * renamed blueprint would otherwise leave a card that 500s on Build.
   */
  it('offers only kinds that are real blueprints, and all of them 3D', () => {
    expect(STUDIO_KINDS.length).toBeGreaterThanOrEqual(5);
    for (const kind of STUDIO_KINDS) {
      const blueprint = blueprintById(kind.id);
      expect(blueprint, kind.id).toBeTruthy();
      // And every one of them must actually be gated, or Studio is a way to
      // get a Premium feature by walking in through a different door.
      expect(blueprintIsThreeD(blueprint!), kind.id).toBe(true);
    }
  });

  /** A 3D blueprint has to put a 3D section on the page it promises one on. */
  it('puts a scene on every 3D blueprint', () => {
    for (const kind of STUDIO_KINDS) {
      const blueprint = blueprintById(kind.id)!;
      const home = blueprint.pages.find((page) => page.path === 'index.html')!;
      expect(home.sections, kind.id).toContain('scene3d');
    }
  });

  /**
   * The complaint that started this: everything Lumen drew in 3D was the same
   * electric lime, so five different businesses previewed as five copies of
   * Lumen. Lime is one option among several now, and nothing may hard-code it.
   */
  it('does not draw everything in one colour', () => {
    const palettes = new Set(STUDIO_PALETTES.map((entry) => entry.tint.join()));
    expect(palettes.size).toBe(STUDIO_PALETTES.length);
    expect(STUDIO_PALETTES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(STUDIO_KINDS.map((entry) => entry.tint.join())).size).toBe(STUDIO_KINDS.length);
    expect(new Set(STUDIO_CATEGORIES.map((entry) => entry.tint.join())).size).toBe(
      STUDIO_CATEGORIES.length,
    );

    // Lumen's own accent, written into a scene by hand. Allowed once in the
    // Scene component's own default and nowhere else — every other scene takes
    // the colour of the thing it is illustrating.
    const hardCoded = sources.filter((path) => {
      if (path.endsWith('Scene.tsx')) return false;
      return /#d7ff3e/i.test(readFileSync(join(process.cwd(), path), 'utf8'));
    });
    expect(hardCoded, 'screens hard-coding the lime accent').toEqual([]);
  });

  it('does not load a 3D engine onto a marketing page', () => {
    // The scenes are CSS. A showcase for an unbuilt feature is not worth half
    // a megabyte of renderer, and one that fails on a mid-range phone is worse
    // than no showcase.
    expect(text).not.toMatch(/from 'three'|@react-three|babylon/i);
  });
});

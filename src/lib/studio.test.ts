import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FEATURES, planFor } from '@/lib/plans';
import {
  STUDIO_CATEGORIES,
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
   * The one that matters. 3D Studio does not exist: it is marked `soon` in the
   * plan catalogue, and a showcase this convincing is exactly the thing that
   * would quietly start reading as a shipped feature. Every screen has to say
   * otherwise, in its own words, where somebody will see it.
   */
  it('says on every screen that it is not built yet', () => {
    expect(FEATURES.three_d.soon).toBe(true);
    for (const path of sources) {
      const source = readFileSync(join(process.cwd(), path), 'utf8');
      // Either the status badge, or the component is a part with no copy of
      // its own — a scene, a grid — that the page around it labels.
      const says = /STUDIO_STATUS|being built|in development|opens to Premium|still being built/i.test(
        source,
      );
      const silent = !/<h1|<h2|font-display text-\[3/.test(source);
      expect(says || silent, `${path} describes the feature without saying it is unbuilt`).toBe(true);
    }
  });

  it('never claims Premium includes it today', () => {
    expect(planFor('premium', 'monthly')!.features).toContain('three_d');
    // "included", "available now", "you can" — the words that would make the
    // promise read as a shipped feature.
    expect(text).not.toMatch(/3D Studio is (included|available|live)/i);
  });

  it('does not load a 3D engine onto a marketing page', () => {
    // The scenes are CSS. A showcase for an unbuilt feature is not worth half
    // a megabyte of renderer, and one that fails on a mid-range phone is worse
    // than no showcase.
    expect(text).not.toMatch(/from 'three'|@react-three|babylon/i);
  });
});

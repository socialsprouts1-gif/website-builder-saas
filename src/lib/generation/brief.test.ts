import { describe, expect, it } from 'vitest';
import { SECTION_BRIEF_HEAD, SECTION_BRIEF_TAIL, sectionBrief } from './brief';

describe('sectionBrief', () => {
  it('leaves an ordinary brief exactly as it was', () => {
    const brief = 'A family dental clinic in Akola, open on Sundays.';
    expect(sectionBrief(brief)).toBe(brief);
  });

  it('trims a very long one to something a section call can afford', () => {
    const brief = 'A'.repeat(20_000);
    const trimmed = sectionBrief(brief);
    expect(trimmed.length).toBeLessThan(SECTION_BRIEF_HEAD + SECTION_BRIEF_TAIL + 20);
    expect(trimmed.length).toBeGreaterThan(1_000);
  });

  /**
   * The last line is almost always the one they cared most about — "and keep
   * every price in rupees" — so a trim that only keeps the front throws away
   * the instruction and keeps the preamble.
   */
  it('keeps the end as well as the beginning', () => {
    const brief = `We sell handmade cotton.\n${'padding. '.repeat(3000)}\nEvery price must be in rupees.`;
    const trimmed = sectionBrief(brief);
    expect(trimmed).toContain('handmade cotton');
    expect(trimmed).toContain('Every price must be in rupees');
  });

  it('says out loud that something was left out', () => {
    expect(sectionBrief('x'.repeat(9000))).toContain('[…]');
  });

  it('does not cut in the middle of a word', () => {
    const brief = `${'We specialise in wholesale supply. '.repeat(200)}Final instruction here.`;
    const trimmed = sectionBrief(brief);
    const head = trimmed.split('\n\n[…]')[0];
    expect(head.endsWith('.')).toBe(true);
  });

  it('copes with a long brief that has no punctuation at all', () => {
    const trimmed = sectionBrief('word '.repeat(6000));
    expect(trimmed.length).toBeGreaterThan(500);
    expect(trimmed).toContain('[…]');
  });

  it('handles an empty or tiny brief without throwing', () => {
    expect(sectionBrief('')).toBe('');
    expect(sectionBrief('  hi  ')).toBe('hi');
  });

  it('keeps the trim well under what twenty calls could afford', () => {
    expect(SECTION_BRIEF_HEAD + SECTION_BRIEF_TAIL).toBeLessThan(2500);
  });
});

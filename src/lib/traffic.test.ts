import { describe, expect, it } from 'vitest';
import { countablePath, looksAutomated, summarise, visitorHash } from './traffic';

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

describe('looksAutomated', () => {
  it('counts a real browser', () => {
    expect(looksAutomated('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15')).toBe(false);
  });

  it.each(['Googlebot/2.1', 'curl/8.4.0', 'python-requests/2.31', 'facebookexternalhit/1.1', 'AhrefsBot'])(
    'does not count %s',
    (agent) => {
      expect(looksAutomated(agent)).toBe(true);
    },
  );

  it('treats a missing or absurd agent as automated', () => {
    expect(looksAutomated(null)).toBe(true);
    expect(looksAutomated('x')).toBe(true);
  });
});

describe('countablePath', () => {
  it('counts pages and nothing else', () => {
    expect(countablePath('about.html')).toBe(true);
    expect(countablePath('about')).toBe(true);
    expect(countablePath('styles.css')).toBe(false);
    expect(countablePath('photo.jpg')).toBe(false);
  });
});

describe('visitorHash', () => {
  const hash = (over: Partial<Parameters<typeof visitorHash>[0]> = {}) =>
    visitorHash({ address: '1.2.3.4', userAgent: 'UA', projectId: 'p1', day: '2026-01-01', ...over });

  it('recognises the same person on the same day', () => {
    expect(hash()).toBe(hash());
  });

  // The day is inside the hash rather than beside it, so yesterday cannot be
  // compared with today even by whoever holds the table.
  it.each([
    ['another day', { day: '2026-01-02' }],
    ['another site', { projectId: 'p2' }],
    ['another person', { address: '5.6.7.8' }],
  ])('cannot be matched against %s', (_label, over) => {
    expect(hash()).not.toBe(hash(over));
  });

  it('keeps nothing that identifies anyone', () => {
    expect(hash()).not.toContain('1.2.3.4');
    expect(hash()).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('summarise', () => {
  const visits = [
    { day: day(-1), path: 'index.html', views: 10 },
    { day: day(-1), path: 'about.html', views: 4 },
    { day: day(-2), path: 'index.html', views: 6 },
    { day: day(-10), path: 'index.html', views: 99 },
  ];
  const visitorDays = [day(-1), day(-1), day(-2), day(-10), day(-11)];
  const summary = summarise(visits, visitorDays);

  it('answers "how many people this week"', () => {
    expect(summary.visitors).toBe(3);
    expect(summary.visitorsBefore).toBe(2);
    expect(summary.views).toBe(20);
  });

  it('puts the busiest page first', () => {
    expect(summary.pages[0]).toEqual({ path: 'index.html', views: 16 });
  });

  it('gives fourteen days, oldest first, with the quiet ones as zero', () => {
    expect(summary.daily).toHaveLength(14);
    expect(summary.daily[0].day).toBe(day(-13));
    expect(summary.daily[13].day).toBe(day(0));
    expect(summary.daily.find((entry) => entry.day === day(-3))?.views).toBe(0);
  });

  it('has an honest answer for a site nobody visited', () => {
    expect(summarise([], [])).toMatchObject({ visitors: 0, views: 0, pages: [] });
  });
});

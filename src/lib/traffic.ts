import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { noteError } from '@/lib/errors';

/**
 * Counting visits to a published site.
 *
 * Counted on the server as the page is served, not by a script in the page.
 * That is not a technical preference: a tag that runs in the browser is blocked
 * for a good share of real visitors, and an owner comparing "12 visits" against
 * the 30 people who actually came has worse than no number.
 *
 * There is no cookie and nothing that identifies a person. A visitor is a
 * one-way hash of their address, their browser and the day, salted with a
 * secret — enough to say "the same person, twice, today", and useless for
 * anything else. It cannot be joined across days or across sites, and it cannot
 * be turned back into an address.
 */

/** Things that fetch pages but are nobody's customer. */
const ROBOTS =
  /(bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|python-requests|headless|lighthouse|pingdom|uptime|semrush|ahrefs|screaming)/i;

export function looksAutomated(userAgent: string | null): boolean {
  if (!userAgent || userAgent.trim().length < 10) return true;
  return ROBOTS.test(userAgent);
}

/**
 * The same person on the same day, and nothing more.
 *
 * The day is in the hash rather than beside it, so yesterday's hash cannot be
 * compared with today's even by whoever holds the table.
 */
export function visitorHash(input: {
  address: string;
  userAgent: string;
  projectId: string;
  day: string;
}): string {
  const secret = env.encryptionKey ?? 'lumen-traffic';
  return createHash('sha256')
    .update(`${secret}|${input.projectId}|${input.day}|${input.address}|${input.userAgent}`)
    .digest('hex')
    .slice(0, 32);
}

/** Only real pages: a stylesheet is not a visit. */
export function countablePath(path: string): boolean {
  return path.endsWith('.html') || !path.includes('.');
}

/**
 * Records one page view. Never throws, never blocks the page.
 *
 * A site must serve whether or not its counter works — the tables arrive in
 * migration 0013, and a database that has not run it should still hand the
 * customer their page.
 */
export async function recordVisit(input: {
  projectId: string;
  path: string;
  address: string;
  userAgent: string | null;
}): Promise<void> {
  if (looksAutomated(input.userAgent)) return;
  if (!countablePath(input.path)) return;

  const day = new Date().toISOString().slice(0, 10);
  try {
    await createAdminClient().rpc('record_visit', {
      p_project: input.projectId,
      p_path: input.path,
      p_visitor: visitorHash({
        address: input.address,
        userAgent: input.userAgent ?? '',
        projectId: input.projectId,
        day,
      }),
    });
  } catch (cause) {
    // Counting is not the point of the request — but a counter that silently
    // stopped is exactly how an owner ends up staring at a flat line.
    noteError({ scope: 'traffic.record', error: cause, projectId: input.projectId });
  }
}

export interface TrafficSummary {
  /** Unique people, this week and the week before it. */
  visitors: number;
  visitorsBefore: number;
  views: number;
  /** Busiest pages this week, most-viewed first. */
  pages: { path: string; views: number }[];
  /** Views per day for the last 14 days, oldest first. */
  daily: { day: string; views: number }[];
}

const DAYS = 14;

/** What happened on this site lately, read back for the owner. */
export async function trafficFor(projectId: string): Promise<TrafficSummary | null> {
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString().slice(0, 10);
  const admin = createAdminClient();

  const [visits, visitors] = await Promise.all([
    admin.from('site_visits').select('day, path, views').eq('project_id', projectId).gte('day', since),
    admin.from('site_visitors').select('day').eq('project_id', projectId).gte('day', since),
  ]);

  // The tables are not there yet. Said with null rather than zeroes, because
  // "nobody visited" and "we are not counting" are different answers.
  if (visits.error || visitors.error) return null;

  return summarise(visits.data ?? [], (visitors.data ?? []).map((row) => row.day));
}

/** The arithmetic, separated from the database so it can be checked. */
export function summarise(
  visits: { day: string; path: string; views: number }[],
  visitorDays: string[],
): TrafficSummary {
  const weekAgo = dayString(-7);

  const recent = visits.filter((row) => row.day >= weekAgo);
  const byPath = new Map<string, number>();
  for (const row of recent) byPath.set(row.path, (byPath.get(row.path) ?? 0) + row.views);

  const byDay = new Map<string, number>();
  for (const row of visits) byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.views);

  const daily = Array.from({ length: DAYS }, (_, index) => {
    const day = dayString(index - (DAYS - 1));
    return { day, views: byDay.get(day) ?? 0 };
  });

  return {
    visitors: visitorDays.filter((day) => day >= weekAgo).length,
    visitorsBefore: visitorDays.filter((day) => day < weekAgo).length,
    views: recent.reduce((total, row) => total + row.views, 0),
    pages: [...byPath.entries()]
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 6),
    daily,
  };
}

function dayString(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}

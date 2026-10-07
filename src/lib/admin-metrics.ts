import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { planByKey, tierName, type PlanTier } from '@/lib/plans';

/**
 * The numbers behind the admin screens.
 *
 * Here rather than inside the pages because the Operations page used to load
 * all of them at once: subscriptions, thirty days of usage events, every
 * project and the moderation queue, on one request, to render three unrelated
 * things. Split into four screens that each load only what they show, that is
 * four small queries instead of one large one — and the revenue page no longer
 * waits on five thousand usage events it does not display.
 *
 * Every function here is read-only and runs on the service-role client, which
 * is the point: these are totals across all accounts, and no RLS policy would
 * let a single user see them.
 */

export interface RevenueSnapshot {
  mrrPaise: number;
  active: number;
  trialing: number;
  cancelled: number;
  churnRate: number;
  total: number;
  /** What the money is actually coming from, newest tier first. */
  byPlan: { key: string; label: string; count: number; mrrPaise: number }[];
}

export async function revenueSnapshot(): Promise<RevenueSnapshot> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('subscriptions').select('status, cancelled_at, plan');
  return summariseSubscriptions(data ?? []);
}

/** The arithmetic, with no database in it. */
export function summariseSubscriptions(
  rows: { status: string; cancelled_at: string | null; plan: string }[],
): RevenueSnapshot {
  const active = rows.filter((row) => row.status === 'active');
  const cancelled = rows.filter((row) => Boolean(row.cancelled_at)).length;

  // Summed from what each subscriber is actually on. Multiplying a count by one
  // price was right when there was one price; with two tiers and two billing
  // periods it would quietly overstate or understate every month.
  const byPlan = new Map<string, { count: number; mrrPaise: number }>();
  let mrrPaise = 0;

  for (const row of active) {
    const plan = planByKey(row.plan);
    const perMonth = plan?.perMonthPaise ?? 0;
    mrrPaise += perMonth;
    const entry = byPlan.get(row.plan) ?? { count: 0, mrrPaise: 0 };
    entry.count += 1;
    entry.mrrPaise += perMonth;
    byPlan.set(row.plan, entry);
  }

  return {
    mrrPaise,
    active: active.length,
    trialing: rows.filter((row) => row.status === 'trialing').length,
    cancelled,
    churnRate: rows.length > 0 ? (cancelled / rows.length) * 100 : 0,
    total: rows.length,
    byPlan: [...byPlan.entries()]
      .map(([key, entry]) => ({
        key,
        label: planByKey(key)?.name ?? tierName((key.split('_')[0] as PlanTier) ?? 'free'),
        ...entry,
      }))
      .sort((left, right) => right.mrrPaise - left.mrrPaise),
  };
}

export interface SpendSnapshot {
  days: number;
  /** What this costs Lumen. */
  platformUsd: number;
  /** Billed to the user's own key, so not a cost. */
  byokUsd: number;
  byModel: { model: string; calls: number; usd: number }[];
  byKind: { kind: string; calls: number; usd: number }[];
  /** True when the window hit the row cap, so the totals are a floor. */
  truncated: boolean;
}

/** The cap exists so one busy month cannot time the page out. */
const USAGE_ROW_CAP = 5000;

export async function spendSnapshot(days = 30): Promise<SpendSnapshot> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('usage_events')
    .select('model, key_source, cost_usd, event_type')
    .gte('created_at', since)
    .limit(USAGE_ROW_CAP);

  return summariseUsage(data ?? [], days);
}

export interface UsageEventLike {
  model: string | null;
  key_source: string | null;
  cost_usd: number | string | null;
  event_type: string | null;
}

/** The arithmetic, with no database in it. */
export function summariseUsage(events: UsageEventLike[], days = 30): SpendSnapshot {
  const byModel = new Map<string, { calls: number; usd: number }>();
  const byKind = new Map<string, { calls: number; usd: number }>();
  let platformUsd = 0;
  let byokUsd = 0;

  for (const event of events) {
    const cost = Number(event.cost_usd ?? 0);
    if (event.key_source === 'platform') platformUsd += cost;
    else byokUsd += cost;

    const model = event.model ?? 'unknown';
    const modelEntry = byModel.get(model) ?? { calls: 0, usd: 0 };
    modelEntry.calls += 1;
    modelEntry.usd += cost;
    byModel.set(model, modelEntry);

    // Images are the expensive ones and a 3D build makes a dozen of them, so
    // "where did the money go" is a question about kind before it is a
    // question about model.
    const kind = event.event_type ?? 'unknown';
    const kindEntry = byKind.get(kind) ?? { calls: 0, usd: 0 };
    kindEntry.calls += 1;
    kindEntry.usd += cost;
    byKind.set(kind, kindEntry);
  }

  const rank = <T extends { usd: number }>(entries: T[]) =>
    entries.sort((left, right) => right.usd - left.usd);

  return {
    days,
    platformUsd,
    byokUsd,
    byModel: rank([...byModel.entries()].map(([model, entry]) => ({ model, ...entry }))),
    byKind: rank([...byKind.entries()].map(([kind, entry]) => ({ kind, ...entry }))),
    truncated: events.length >= USAGE_ROW_CAP,
  };
}

export interface FlaggedRow {
  id: string;
  projectId: string | null;
  reason: string;
  detail: string | null;
  createdAt: string;
}

export async function flaggedQueue(limit = 50): Promise<FlaggedRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('flagged_content')
    .select('id, project_id, reason, detail, created_at')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    reason: row.reason,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}

/**
 * The counts on the overview, as one round trip per thing being counted.
 *
 * `head: true` with an exact count returns the number without the rows, which
 * is what makes this cheap enough to run on a page that only prints it.
 */
export async function overviewCounts(): Promise<{
  sitesReady: number;
  sitesTotal: number;
  flagged: number;
  unresolvedErrors: number;
}> {
  const supabase = createAdminClient();

  const [ready, total, flagged, errors] = await Promise.all([
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('is_template', false)
      .eq('status', 'ready'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('is_template', false),
    supabase
      .from('flagged_content')
      .select('id', { count: 'exact', head: true })
      .eq('resolved', false),
    supabase.from('error_events').select('id', { count: 'exact', head: true }),
  ]);

  return {
    sitesReady: ready.count ?? 0,
    sitesTotal: total.count ?? 0,
    flagged: flagged.count ?? 0,
    unresolvedErrors: errors.count ?? 0,
  };
}

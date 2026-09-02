import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { CREDIT_COST, DAILY_PLATFORM_CREDITS, type CreditedEvent } from '@/lib/env';

/**
 * The users panel reads through the service role, which bypasses row-level
 * security by design — it is the one surface that must see every account.
 * Every function here calls requireAdmin() first, so the guard travels with
 * the data access instead of living only in the page that renders it.
 */

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  businessType: string | null;
  isAdmin: boolean;
  createdAt: string;
  projectCount: number;
  hasOwnKey: boolean;
  creditsUsedToday: number;
  creditsLimit: number;
  plan: {
    status: string;
    periodEnd: string | null;
    cancelledAt: string | null;
  } | null;
}

function startOfUtcDay(): string {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
}

export async function listUsers(search?: string): Promise<AdminUserRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase
    .from('users')
    .select('id, email, full_name, onboarding_business_type, is_admin, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (search?.trim()) query = query.ilike('email', `%${search.trim()}%`);

  const { data: users } = await query;
  if (!users || users.length === 0) return [];

  const ids = users.map((user) => user.id);

  // Three grouped reads rather than a query per user.
  const [{ data: projects }, { data: subscriptions }, { data: keys }, { data: usage }] =
    await Promise.all([
      supabase.from('projects').select('user_id').in('user_id', ids).eq('is_template', false),
      supabase
        .from('subscriptions')
        .select('user_id, status, current_period_end, cancelled_at')
        .in('user_id', ids),
      supabase
        .from('api_keys')
        .select('user_id')
        .in('user_id', ids)
        .eq('provider', 'openai')
        .eq('is_active', true),
      supabase
        .from('usage_events')
        .select('user_id, event_type')
        .in('user_id', ids)
        .eq('key_source', 'platform')
        .gte('created_at', startOfUtcDay())
        .limit(5000),
    ]);

  const projectCounts = new Map<string, number>();
  for (const row of projects ?? []) {
    projectCounts.set(row.user_id, (projectCounts.get(row.user_id) ?? 0) + 1);
  }

  const credits = new Map<string, number>();
  for (const row of usage ?? []) {
    const cost = CREDIT_COST[row.event_type as CreditedEvent] ?? 0;
    credits.set(row.user_id, (credits.get(row.user_id) ?? 0) + cost);
  }

  const keyOwners = new Set((keys ?? []).map((row) => row.user_id));
  const plans = new Map((subscriptions ?? []).map((row) => [row.user_id, row]));

  return users.map((user) => {
    const plan = plans.get(user.id);
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      businessType: user.onboarding_business_type,
      isAdmin: user.is_admin,
      createdAt: user.created_at,
      projectCount: projectCounts.get(user.id) ?? 0,
      hasOwnKey: keyOwners.has(user.id),
      creditsUsedToday: credits.get(user.id) ?? 0,
      creditsLimit: DAILY_PLATFORM_CREDITS,
      plan: plan
        ? {
            status: plan.status,
            periodEnd: plan.current_period_end,
            cancelledAt: plan.cancelled_at,
          }
        : null,
    };
  });
}

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  const actor = await requireAdmin();

  // Removing your own access locks you out of the panel you are standing in.
  if (actor.id === userId && !isAdmin) {
    throw new Error('You cannot remove your own admin access.');
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('users').update({ is_admin: isAdmin }).eq('id', userId);
  if (error) throw new Error(error.message);
}

/** Extends (or starts) a free trial by a number of days from now. */
export async function grantTrialDays(userId: string, days: number) {
  await requireAdmin();
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    throw new Error('Pick between 1 and 365 days.');
  }

  const supabase = createAdminClient();
  const periodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'trialing',
        current_period_end: periodEnd,
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .insert({ user_id: userId, status: 'trialing', current_period_end: periodEnd });
  if (error) throw new Error(error.message);
}

/** Ends access now — the account keeps its data but cannot generate. */
export async function endTrial(userId: string) {
  const actor = await requireAdmin();
  if (actor.id === userId) throw new Error('You cannot end your own access.');

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'expired',
      current_period_end: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function adminStats() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ count: users }, { count: projects }] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('is_template', false),
  ]);

  return { users: users ?? 0, projects: projects ?? 0 };
}

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { SchemaNotInstalledError, isMissingTableError } from '@/lib/supabase/errors';
import { requireAdmin } from '@/lib/auth';
import { CREDIT_COST, FREE_CREDITS, type CreditedEvent } from '@/lib/env';

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
  /** Everything ever spent on the shared key, in credits. */
  creditsUsed: number;
  /** Of what they have, how much an admin gave them by hand. */
  creditsGranted: number;
  creditsLeft: number;
  plan: {
    status: string;
    periodEnd: string | null;
    cancelledAt: string | null;
  } | null;
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
  const [{ data: projects }, { data: subscriptions }, { data: keys }, { data: usage }, { data: grants }] =
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
      // Everything ever spent, not today's: the free grant is a lifetime pot,
      // so "used today" was a number that answered no question anybody asked.
      supabase
        .from('usage_events')
        .select('user_id, event_type')
        .in('user_id', ids)
        .eq('key_source', 'platform')
        .limit(10_000),
      supabase.from('credit_grants').select('user_id, credits').in('user_id', ids).limit(2000),
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

  const granted = new Map<string, number>();
  for (const row of grants ?? []) {
    granted.set(row.user_id, (granted.get(row.user_id) ?? 0) + (row.credits ?? 0));
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
      creditsUsed: credits.get(user.id) ?? 0,
      creditsGranted: granted.get(user.id) ?? 0,
      creditsLeft: Math.max(
        0,
        FREE_CREDITS + (granted.get(user.id) ?? 0) - (credits.get(user.id) ?? 0),
      ),
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

/**
 * Gives an account credits by hand.
 *
 * A row rather than a balance, for the same reason the free tier is derived:
 * nothing to keep in step, every credit has a date and a reason against it, and
 * taking one back is a negative row rather than an edit that erases why.
 *
 * Negative amounts are allowed on purpose — a grant made in error has to be
 * reversible, and reversing it should leave the mistake visible.
 */
export async function grantCredits(userId: string, credits: number, reason?: string) {
  const actor = await requireAdmin();

  if (!Number.isInteger(credits) || credits === 0) {
    throw new Error('Enter a whole number of credits.');
  }
  if (Math.abs(credits) > 10_000) {
    throw new Error('That is more than 10,000 credits. Add them in smaller grants.');
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('credit_grants').insert({
    user_id: userId,
    credits,
    reason: reason?.trim() || null,
    granted_by: actor.id,
  });

  if (isMissingTableError(error)) throw new SchemaNotInstalledError();
  if (error) throw new Error(error.message);
}

/** Finds an account by email, for granting credits to somebody by address. */
export async function findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('users')
    .select('id, email')
    .ilike('email', email.trim())
    .maybeSingle();

  return data ?? null;
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

import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { env, isSupabaseConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureUserProfile } from '@/lib/profile';
import type { UserRow } from '@/lib/database.types';

export async function getSessionUser() {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Returns the auth user plus the mirrored public.users profile row. */
export async function getCurrentUser(): Promise<{ id: string; email: string; profile: UserRow | null } | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

  // A missing profile is already detected here, so healing it costs no extra
  // read and one write that happens at most once per account.
  const resolved =
    profile ??
    (await ensureUserProfile({
      id: user.id,
      email: user.email ?? '',
      fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
      avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    }).catch(() => null));

  return { id: user.id, email: user.email ?? '', profile: resolved ?? null };
}

export async function requireUser() {
  // A deployment with no database cannot sign anyone in, so say that plainly
  // rather than bouncing to a login form that could never work.
  if (!isSupabaseConfigured) redirect('/setup');

  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** True when the address is on the deployment's bootstrap allowlist. */
export function isBootstrapAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.adminEmails.includes(email.toLowerCase());
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.profile?.is_admin) return user;

  // First run: the allowlist grants access and the flag is written back, so
  // the database becomes the source of truth from the second visit onward.
  if (isBootstrapAdmin(user.email)) {
    try {
      await createAdminClient().from('users').update({ is_admin: true }).eq('id', user.id);
    } catch {
      // Service role unavailable — access is still correct for this request.
    }
    return { ...user, profile: user.profile ? { ...user.profile, is_admin: true } : null };
  }

  redirect('/app');
}

/** Email verification gate — enforced before the first generation (Section 13). */
export async function isEmailVerified(): Promise<boolean> {
  const user = await getSessionUser();
  return Boolean(user?.email_confirmed_at);
}

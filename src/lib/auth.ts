import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserRow } from '@/lib/database.types';

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Returns the auth user plus the mirrored public.users profile row. */
export async function getCurrentUser(): Promise<{ id: string; email: string; profile: UserRow | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
  return { id: user.id, email: user.email ?? '', profile: profile ?? null };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.profile?.is_admin) redirect('/app');
  return user;
}

/** Email verification gate — enforced before the first generation (Section 13). */
export async function isEmailVerified(): Promise<boolean> {
  const user = await getSessionUser();
  return Boolean(user?.email_confirmed_at);
}

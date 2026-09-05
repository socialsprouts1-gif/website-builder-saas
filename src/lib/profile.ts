import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRow } from '@/lib/database.types';

/**
 * Guarantees the public.users row exists for a signed-in account.
 *
 * The handle_new_user trigger mirrors auth.users on insert, but it only covers
 * signups that happen after it is installed. Anyone who registered before the
 * migrations ran — or whose trigger failed — has an auth identity and no
 * profile row, and since six tables carry a foreign key to public.users, the
 * first write they attempt fails with a constraint violation rather than
 * anything that explains itself.
 *
 * Written through the service role: public.users has select and update
 * policies for the owner but deliberately no insert policy, because rows are
 * meant to originate from the trigger.
 */
export async function ensureUserProfile(params: {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}): Promise<UserRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: params.id,
        email: params.email,
        full_name: params.fullName ?? null,
        avatar_url: params.avatarUrl ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select('*')
    .maybeSingle();

  // ignoreDuplicates returns no row when one already existed; read it back.
  if (!error && data) return data;

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  return existing ?? null;
}

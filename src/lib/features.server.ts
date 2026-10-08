import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isMissingTableError } from '@/lib/supabase/errors';
import {
  FEATURE_LIST,
  isFeatureKey,
  resolveFeatures,
  type FeatureKey,
  type FlagSources,
} from './features';

/**
 * The switches, read from the database.
 *
 * Every one of these degrades to "nothing is stored", which the resolver reads
 * as "use the defaults in the code". That is deliberate and it is the most
 * important line in the file: the feature table may not exist yet on a
 * deployment that has not run the migration, and the answer to "is 3D Studio
 * open" must be "yes, as the code says" rather than a 500 on every page.
 */
export async function loadFlags(userId: string | null): Promise<FlagSources> {
  const supabase = createAdminClient();

  const [globalRows, userRows] = await Promise.all([
    supabase.from('feature_flags').select('key, enabled'),
    userId
      ? supabase.from('user_features').select('key, enabled').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const read = (rows: { key: string; enabled: boolean }[] | null | undefined) => {
    const out: Partial<Record<FeatureKey, boolean>> = {};
    for (const row of rows ?? []) {
      // A key that is no longer in the catalogue is ignored rather than
      // carried: a renamed feature should not leave a switch that silently
      // controls nothing.
      if (isFeatureKey(row.key)) out[row.key] = row.enabled;
    }
    return out;
  };

  if (isMissingTableError(globalRows.error)) return {};

  return { global: read(globalRows.data), user: read(userRows.data) };
}

/** Every switch for one account, resolved. */
export async function featuresFor(
  userId: string | null,
  options: { admin?: boolean } = {},
): Promise<Record<FeatureKey, boolean>> {
  const sources = await loadFlags(userId).catch(() => ({}) as FlagSources);
  return resolveFeatures(sources, options);
}

/** The global switches alone, for the admin screen. */
export async function globalFlags(): Promise<Partial<Record<FeatureKey, boolean>>> {
  const sources = await loadFlags(null).catch(() => ({}) as FlagSources);
  return sources.global ?? {};
}

/**
 * Flips a global switch.
 *
 * Upserted rather than inserted, because a switch that has been flipped twice
 * is one row with the later value, not two rows whose order decides the answer.
 */
export async function setGlobalFlag(key: FeatureKey, enabled: boolean, actorId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('feature_flags')
    .upsert({ key, enabled, updated_by: actorId, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/**
 * Sets, or clears, one account's override.
 *
 * `null` deletes the row rather than writing `false`, which is the difference
 * between "this account follows the global switch" and "this account is
 * switched off". Without the delete there would be no way back to the former.
 */
export async function setUserFlag(
  userId: string,
  key: FeatureKey,
  enabled: boolean | null,
  actorId: string,
) {
  const supabase = createAdminClient();

  if (enabled === null) {
    const { error } = await supabase
      .from('user_features')
      .delete()
      .eq('user_id', userId)
      .eq('key', key);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from('user_features').upsert({
    user_id: userId,
    key,
    enabled,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Which accounts have an override, for showing it against them in the list. */
export async function overridesByUser(): Promise<Map<string, Partial<Record<FeatureKey, boolean>>>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('user_features').select('user_id, key, enabled');
  const out = new Map<string, Partial<Record<FeatureKey, boolean>>>();
  if (error || !data) return out;

  for (const row of data) {
    if (!isFeatureKey(row.key)) continue;
    const entry = out.get(row.user_id) ?? {};
    entry[row.key] = row.enabled;
    out.set(row.user_id, entry);
  }
  return out;
}

export { FEATURE_LIST };

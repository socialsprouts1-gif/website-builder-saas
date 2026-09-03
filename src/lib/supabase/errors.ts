/**
 * Supabase is not an optional integration the way OpenAI or Razorpay are — it
 * is auth and the database. But a deployment can still be missing its keys
 * (a fresh Vercel project, a preview branch), and that must produce a clear
 * "finish setting this up" screen rather than a 500.
 */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Lumen is not connected to Supabase yet. Add its URL and keys to this deployment.');
    this.name = 'SupabaseNotConfiguredError';
  }
}

/** Which required environment variables this deployment is missing. */
export function missingSupabaseVars(): string[] {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  return required.filter((name) => !process.env[name]);
}

/**
 * PostgREST reports an absent table as "Could not find the table 'x' in the
 * schema cache" (code PGRST205). That means the migrations have not been run —
 * a deployment step, not a bug — so it deserves its own message rather than
 * leaking the raw provider string into the UI.
 */
export class SchemaNotInstalledError extends Error {
  constructor() {
    super(
      "Lumen's database tables are not installed yet. Run supabase/migrations/0001_init.sql through 0004_freemium.sql in your Supabase SQL editor, in order.",
    );
    this.name = 'SchemaNotInstalledError';
  }
}

export function isMissingTableError(error: unknown): boolean {
  if (!error) return false;
  const candidate = error as { code?: string; message?: string };
  if (candidate.code === 'PGRST205' || candidate.code === '42P01') return true;
  return Boolean(candidate.message && /schema cache|does not exist/i.test(candidate.message));
}

/**
 * Cheap head-count against a core table. Cached briefly so the setup page and
 * the app shell can both ask without adding a query to every request.
 */
let schemaCache: { installed: boolean; expiresAt: number } | null = null;

export async function isSchemaInstalled(): Promise<boolean> {
  if (schemaCache && schemaCache.expiresAt > Date.now()) return schemaCache.installed;

  let installed = false;
  try {
    const { createAdminClient } = await import('./admin');
    const { error } = await createAdminClient()
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    installed = !isMissingTableError(error);
  } catch {
    installed = false;
  }

  // Failures are re-checked sooner than successes, so a freshly run migration
  // is picked up quickly instead of being cached away for an hour.
  schemaCache = { installed, expiresAt: Date.now() + (installed ? 300_000 : 15_000) };
  return installed;
}

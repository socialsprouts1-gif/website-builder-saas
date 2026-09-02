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

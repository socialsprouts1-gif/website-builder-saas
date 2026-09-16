/**
 * Values the app reads through `@/lib/env`.
 *
 * Set before anything imports it, so a test never depends on the machine it is
 * running on. None of these reach a real service: no test here makes a network
 * call, and anything that would is tested through its pure parts instead.
 */
process.env.LUMEN_ENCRYPTION_KEY ??= 'test-encryption-key-not-a-real-one';
process.env.NEXT_PUBLIC_SITE_URL ??= 'https://lumen.test';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://supabase.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-test-key';

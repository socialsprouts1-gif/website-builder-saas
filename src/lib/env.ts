/**
 * Central environment access. Nothing in the app reads process.env directly —
 * this keeps "is the feature configured?" a single, testable question so every
 * unconfigured integration can render a "connect your key" state instead of
 * crashing (spec Section 0).
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function clean(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

/**
 * NEXT_PUBLIC_* values MUST be read as literal `process.env.NAME` expressions.
 *
 * Next.js substitutes them into the browser bundle at build time by matching
 * that exact static form — a computed lookup like `process.env[name]` is left
 * untouched and evaluates to undefined in the browser. Reading these through
 * the generic `read()` helper meant the server saw them and the client did not,
 * so pages server-rendered fine and then threw the moment client code ran.
 */
const PUBLIC = {
  siteUrl: clean(process.env.NEXT_PUBLIC_SITE_URL),
  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
} as const;

export const env = {
  siteUrl: PUBLIC.siteUrl ?? 'http://localhost:3000',

  supabase: {
    url: PUBLIC.supabaseUrl,
    anonKey: PUBLIC.supabaseAnonKey,
    // Server-only, so a runtime lookup is correct and keeps it out of the bundle.
    serviceRoleKey: read('SUPABASE_SERVICE_ROLE_KEY'),
  },

  openai: {
    platformKey: read('OPENAI_API_KEY'),
  },

  razorpay: {
    keyId: read('RAZORPAY_KEY_ID'),
    keySecret: read('RAZORPAY_KEY_SECRET'),
    planId: read('RAZORPAY_PLAN_ID'),
    webhookSecret: read('RAZORPAY_WEBHOOK_SECRET'),
  },

  encryptionKey: read('LUMEN_ENCRYPTION_KEY'),

  /**
   * Bootstrap admins, comma-separated. Anyone signing in with one of these
   * addresses is treated as an admin and has the flag written back to their
   * row, so a fresh deployment has an owner without anyone running SQL by hand.
   * Removing an address here does not revoke the stored flag — do that from
   * the users panel.
   */
  adminEmails: (read('LUMEN_ADMIN_EMAILS') ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),

  connectors: {
    github: { id: read('GITHUB_CLIENT_ID'), secret: read('GITHUB_CLIENT_SECRET') },
    google: { id: read('GOOGLE_CLIENT_ID'), secret: read('GOOGLE_CLIENT_SECRET') },
    slack: { id: read('SLACK_CLIENT_ID'), secret: read('SLACK_CLIENT_SECRET') },
    notion: { id: read('NOTION_CLIENT_ID'), secret: read('NOTION_CLIENT_SECRET') },
    hubspot: { id: read('HUBSPOT_CLIENT_ID'), secret: read('HUBSPOT_CLIENT_SECRET') },
    vercel: { id: read('VERCEL_CLIENT_ID'), secret: read('VERCEL_CLIENT_SECRET') },
  },
} as const;

export const isSupabaseConfigured = Boolean(env.supabase.url && env.supabase.anonKey);
export const isBillingConfigured = Boolean(env.razorpay.keyId && env.razorpay.keySecret);
export const isPlatformKeyConfigured = Boolean(env.openai.platformKey);

/**
 * Free credits per day on Lumen's pooled platform key. Ten is enough to build
 * one site and iterate on it: a generation costs 3, each edit costs 1.
 * Bring-your-own-key has no ceiling — it bills to the user's own account.
 */
export const DAILY_PLATFORM_CREDITS = 10;

/**
 * The paid tier's daily ceiling. High enough that a small business never feels
 * it, finite so one runaway account cannot outspend a ₹500 subscription on the
 * shared key. Users who genuinely want no ceiling add their own OpenAI key.
 */
export const PRO_DAILY_PLATFORM_CREDITS = 200;

/**
 * What each kind of model call costs against the daily allowance.
 *
 * Every entry that spends real money is priced. Previously only the initial
 * generation was counted, which left chat edits, screenshot analysis, embedding
 * and chatbot replies drawing on the platform key without limit.
 */
export const CREDIT_COST = {
  generation: 3,
  vision: 1,
  chat_edit: 1,
  image: 1,
  embedding: 1,
  chatbot_reply: 1,
  // Transcription is a fraction of a cent and already capped at 60/hour.
  transcription: 0,
} as const;

export type CreditedEvent = keyof typeof CREDIT_COST;

/** ₹500/month, expressed in paise the way Razorpay wants it. */
export const PLAN_PRICE_PAISE = 50_000;
export const PLAN_PRICE_LABEL = '₹500';

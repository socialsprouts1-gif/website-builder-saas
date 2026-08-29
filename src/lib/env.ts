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

export const env = {
  siteUrl: read('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000',

  supabase: {
    url: read('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: read('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
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

/** Free generations per calendar month on Lumen's pooled platform key. */
export const FREE_PLATFORM_GENERATIONS_PER_MONTH = 10;

/** ₹500/month, expressed in paise the way Razorpay wants it. */
export const PLAN_PRICE_PAISE = 50_000;
export const PLAN_PRICE_LABEL = '₹500';

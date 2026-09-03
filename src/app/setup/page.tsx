import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { isSupabaseConfigured, isBillingConfigured, isPlatformKeyConfigured } from '@/lib/env';
import { isSchemaInstalled } from '@/lib/supabase/errors';

export const metadata: Metadata = { title: 'Finish setting up Lumen' };
export const dynamic = 'force-dynamic';

/**
 * Shown instead of a 500 when a deployment is missing the credentials the
 * authenticated app needs. Supabase is the only hard requirement — everything
 * else degrades on its own — so this page says exactly which variables are
 * absent and what each one unlocks.
 */
export default async function SetupPage() {
  // Once Supabase is wired up AND the tables exist there is nothing to show.
  const schemaInstalled = isSupabaseConfigured ? await isSchemaInstalled() : false;
  if (isSupabaseConfigured && schemaInstalled) redirect('/app');

  const groups = [
    {
      title: 'Supabase',
      required: true,
      unlocks: 'Sign-in, your projects, and everything behind them. Nothing in /app works without this.',
      vars: [
        { name: 'NEXT_PUBLIC_SUPABASE_URL', set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
        { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
        { name: 'SUPABASE_SERVICE_ROLE_KEY', set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
      ],
    },
    {
      title: 'Encryption',
      required: true,
      unlocks: 'Encrypts stored OpenAI keys and connector tokens. Generate with: openssl rand -base64 32',
      vars: [{ name: 'LUMEN_ENCRYPTION_KEY', set: Boolean(process.env.LUMEN_ENCRYPTION_KEY) }],
    },
    {
      title: 'OpenAI',
      required: false,
      unlocks: 'Lumen’s shared key. Optional — without it, users bring their own key instead.',
      vars: [{ name: 'OPENAI_API_KEY', set: isPlatformKeyConfigured }],
    },
    {
      title: 'Razorpay',
      required: false,
      unlocks: 'Subscriptions. Optional — billing shows a “not connected” state until these exist.',
      vars: [
        { name: 'RAZORPAY_KEY_ID', set: Boolean(process.env.RAZORPAY_KEY_ID) },
        { name: 'RAZORPAY_KEY_SECRET', set: isBillingConfigured },
        { name: 'RAZORPAY_PLAN_ID', set: Boolean(process.env.RAZORPAY_PLAN_ID) },
        { name: 'RAZORPAY_WEBHOOK_SECRET', set: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET) },
      ],
    },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="lumen-glow-field" aria-hidden />

      <div className="relative mx-auto max-w-2xl px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-[13px] text-ink-muted transition hover:text-ink-primary">
            ← Back to site
          </Link>
        </div>

        <Badge tone="warning" className="mb-5">Setup required</Badge>
        <h1 className="font-display text-[34px] leading-tight text-ink-primary">
          {isSupabaseConfigured ? (
            <>Almost there — <em className="italic text-accent">run the migrations.</em></>
          ) : (
            <>Almost there — <em className="italic text-accent">connect the database.</em></>
          )}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-secondary">
          {isSupabaseConfigured
            ? 'Supabase is connected but Lumen\u2019s tables do not exist yet, so nothing can be saved. Run the migration files below and this page will let you through.'
            : 'The public pages work, but signing in and building sites need Supabase. Add the variables below to this deployment\u2019s environment, redeploy, and the app comes alive.'}
        </p>

        <div className="mt-9 space-y-4">
          {groups.map((group) => {
            const missing = group.vars.filter((item) => !item.set).length;
            return (
              <div key={group.title} className="rounded-card border border-hairline bg-raised p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg text-ink-primary">{group.title}</h2>
                  <Badge tone={missing === 0 ? 'accent' : group.required ? 'warning' : 'neutral'}>
                    {missing === 0 ? 'Configured' : group.required ? `${missing} missing` : 'Optional'}
                  </Badge>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{group.unlocks}</p>
                <ul className="mt-4 space-y-1.5">
                  {group.vars.map((item) => (
                    <li key={item.name} className="flex items-center gap-2.5 font-mono text-[12px]">
                      <span className={item.set ? 'text-accent' : 'text-ink-muted'} aria-hidden>
                        {item.set ? '●' : '○'}
                      </span>
                      <span className={item.set ? 'text-ink-secondary' : 'text-ink-muted'}>{item.name}</span>
                      <span className="sr-only">{item.set ? 'set' : 'not set'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div
          className={`mt-9 rounded-card border p-5 ${
            schemaInstalled ? 'border-hairline bg-raised' : 'border-accent/40 bg-accent-soft'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg text-ink-primary">Run the migrations</h2>
            <Badge tone={schemaInstalled ? 'accent' : 'warning'}>
              {schemaInstalled ? 'Tables installed' : 'Not run yet'}
            </Badge>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            Paste <span className="font-mono text-[12px] text-ink-primary">supabase/migrations/0001_init.sql</span>{' '}
            through{' '}
            <span className="font-mono text-[12px] text-ink-primary">0004_freemium.sql</span> into your
            project&apos;s SQL editor, in order. They create the schema, enable row-level security on every
            table, add the storage bucket, grant the first admin and set up the free tier.
          </p>
        </div>

        <div className="mt-8">
          <ButtonLink href="/">Back to the homepage</ButtonLink>
        </div>
      </div>
    </div>
  );
}

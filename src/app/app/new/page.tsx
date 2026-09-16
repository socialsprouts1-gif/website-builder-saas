import { Suspense } from 'react';
import Link from 'next/link';
import { NewSiteForm } from '@/components/app/NewSiteForm';
import { Badge } from '@/components/ui/Badge';
import { CreditMeter } from '@/components/app/CreditMeter';
import { requireUser } from '@/lib/auth';
import { CREDIT_COST, DAILY_PLATFORM_CREDITS, WELCOME_CREDITS } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getKeyStatus, resolveApiKeyForMetadata } from '@/lib/openai/client';
import { fallbackCatalog, getModelCatalog } from '@/lib/openai/models';

export const metadata = { title: 'New site' };
export const dynamic = 'force-dynamic';

export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireUser();
  const { category } = await searchParams;

  // Remembered here rather than in onboarding, so the choice survives coming
  // back later without onboarding needing an action that can fail invisibly.
  if (category && /^[a-z-]{2,40}$/.test(category) && category !== user.profile?.onboarding_business_type) {
    const supabase = await createClient();
    await supabase
      .from('users')
      .update({ onboarding_business_type: category })
      .eq('id', user.id)
      .then(() => undefined, () => undefined);
  }

  // The picker is seeded from the live model list where a key is available, and
  // from the fallback catalog otherwise — never a hardcoded dropdown.
  let catalog = fallbackCatalog(true);
  try {
    const resolved = await resolveApiKeyForMetadata(user.id);
    if (resolved) catalog = await getModelCatalog(resolved.apiKey);
  } catch {
    // No key yet, or free quota spent — the notice below explains it.
  }

  const keyStatus = await getKeyStatus(user.id).catch(() => null);
  const outOfQuota = keyStatus
    ? !keyStatus.hasOwnKey &&
      !keyStatus.unlimited &&
      keyStatus.creditsRemaining < CREDIT_COST.generation
    : false;
  const noKeyAtAll = keyStatus ? !keyStatus.hasOwnKey && !keyStatus.platformConfigured : false;

  // A first-time visit, which is the only time any of this needs explaining.
  // Everyone else has seen it and does not need telling twice.
  const supabase = await createClient();
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('is_template', false);
  const firstTime = (count ?? 0) === 0 && !keyStatus?.unlimited;

  return (
    <div className="mx-auto max-w-2xl px-5 py-9 sm:px-6 sm:py-14">
      {firstTime ? (
        // Said once, on the only visit where it is news. Everything a new
        // account needs to know before it spends anything: what it has, what a
        // site costs, and that running out is not the end of the account.
        <div className="mb-8 rounded-card border border-accent/25 bg-accent-soft/30 p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Welcome</p>
          <p className="mt-1.5 font-display text-[19px] leading-tight text-ink-primary">
            You have enough to build {Math.floor(WELCOME_CREDITS / CREDIT_COST.generation)} sites right now
          </p>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink-secondary">
            <li>
              <span className="text-ink-primary">{WELCOME_CREDITS} credits to start</span>, plus{' '}
              {DAILY_PLATFORM_CREDITS} more every day. A whole site costs {CREDIT_COST.generation} — the pages
              and sections after that are free.
            </li>
            <li>
              Changing something afterwards costs {CREDIT_COST.chat_edit}. Publishing, editing by hand and
              your own photos cost nothing.
            </li>
            <li>
              Run out and your sites stay live.{' '}
              <Link href="/app/settings/api-keys" className="text-accent hover:underline">
                Add your own OpenAI key
              </Link>{' '}
              and nothing is metered at all.
            </li>
          </ul>
        </div>
      ) : null}

      <div className="mb-9 text-center">
        <Badge tone="accent" className="mb-5">One prompt</Badge>
        <h1 className="font-display text-[36px] leading-tight text-ink-primary">
          What are we <em className="italic text-accent">building?</em>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-secondary">
          Describe it, upload a screenshot, or say it out loud. Same generator, three ways in.
        </p>
        <p className="mt-3 text-[13px] text-ink-muted">
          Already on Google?{' '}
          <Link href="/app/google" className="text-accent hover:underline">
            Build from your listing
          </Link>{' '}
          — name, hours, photos and reviews, already filled in.
        </p>
        <p className="mt-2 text-[13px] text-ink-muted">
          Not sure what to ask for?{' '}
          <Link href="/ideas" className="text-accent hover:underline">
            See what a site for your kind of business looks like
          </Link>
          .
        </p>
      </div>

      {noKeyAtAll || outOfQuota ? (
        <div className="mb-6 rounded-card border border-accent/30 bg-accent-soft px-5 py-4 text-[13px] text-ink-secondary">
          {noKeyAtAll ? (
            <>
              No OpenAI key is configured yet.{' '}
              <Link href="/app/settings/api-keys" className="text-accent hover:underline">
                Add your key
              </Link>{' '}
              to start generating.
            </>
          ) : (
            <>
              You do not have enough credits left for a new site (a build costs{' '}
              {CREDIT_COST.generation}).{' '}
              <Link href="/app/settings/api-keys" className="text-accent hover:underline">
                Add your own OpenAI key
              </Link>{' '}
              for unlimited generations.
            </>
          )}
        </div>
      ) : keyStatus ? (
        <div className="mb-6">
          <CreditMeter
            used={keyStatus.creditsUsed}
            limit={keyStatus.creditsLimit}
            resetsAt={keyStatus.resetsAt}
            hasOwnKey={keyStatus.hasOwnKey}
            platformConfigured={keyStatus.platformConfigured}
            welcomeRemaining={keyStatus.welcomeRemaining}
            welcomeTotal={keyStatus.welcomeTotal}
            tier={keyStatus.tier}
            unlimited={keyStatus.unlimited}
            variant="panel"
          />
        </div>
      ) : null}

      <Suspense fallback={<div className="h-72" />}>
        <NewSiteForm
          models={{ quality: catalog.quality, fast: catalog.fast, all: catalog.all }}
          defaultModel={user.profile?.default_model ?? null}
          defaultCategory={category ?? user.profile?.onboarding_business_type ?? null}
        />
      </Suspense>
    </div>
  );
}

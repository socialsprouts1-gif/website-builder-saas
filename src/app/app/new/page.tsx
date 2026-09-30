import { Suspense } from 'react';
import Link from 'next/link';
import { NewSiteForm } from '@/components/app/NewSiteForm';
import { TemplateInterview } from '@/components/templates/TemplateInterview';
import { PageThumb } from '@/components/ui/PageThumb';
import { blueprintById, blueprintCard } from '@/lib/templates';
import { Badge } from '@/components/ui/Badge';
import { CreditMeter } from '@/components/app/CreditMeter';
import { requireUser } from '@/lib/auth';
import { CREDIT_COST, FREE_CREDITS } from '@/lib/env';
import { canAfford, exhaustedMessage } from '@/lib/credits';
import { OpenUpgradeWhenBlocked } from '@/components/app/UpgradeDialog';
import { createClient } from '@/lib/supabase/server';
import { getKeyStatus, resolveApiKeyForMetadata } from '@/lib/openai/client';
import { fallbackCatalog, getModelCatalog } from '@/lib/openai/models';

export const metadata = { title: 'New site' };
export const dynamic = 'force-dynamic';

export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; template?: string }>;
}) {
  const user = await requireUser();
  const { category, template } = await searchParams;
  const blueprint = blueprintById(template);

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
    ? !keyStatus.hasOwnKey && !canAfford(keyStatus.balance, CREDIT_COST.generation)
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
      {/* Said on arrival rather than after a prompt and four questions. */}
      <OpenUpgradeWhenBlocked
        blocked={outOfQuota && keyStatus?.tier === 'free'}
        message={keyStatus ? exhaustedMessage(keyStatus.balance) : undefined}
      />
      {firstTime ? (
        // Said once, on the only visit where it is news. Everything a new
        // account needs to know before it spends anything: what it has, what a
        // site costs, and that running out is not the end of the account.
        <div className="mb-8 rounded-card border border-accent/25 bg-accent-soft/30 p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Welcome</p>
          <p className="mt-1.5 font-display text-[19px] leading-tight text-ink-primary">
            You have enough to build {Math.floor(FREE_CREDITS / CREDIT_COST.generation)} whole sites, free
          </p>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink-secondary">
            <li>
              <span className="text-ink-primary">{FREE_CREDITS} credits, once</span>, with no card and no
              expiry. A whole site costs {CREDIT_COST.generation} — every page and section inside it is
              free.
            </li>
            <li>
              Changing something afterwards costs {CREDIT_COST.chat_edit}. Publishing, editing by hand and
              your own photos cost nothing.
            </li>
            <li>
              When they run out your sites stay live, stay published and stay exportable — only new
              generating stops.{' '}
              <Link href="/app/settings/billing" className="text-accent hover:underline">
                Upgrade
              </Link>{' '}
              to carry on, or{' '}
              <Link href="/app/settings/api-keys" className="text-accent hover:underline">
                add your own OpenAI key
              </Link>{' '}
              and nothing is metered at all.
            </li>
          </ul>
        </div>
      ) : null}

      {blueprint ? (
        <div className="mb-9">
          <Link href="/templates" className="text-[12.5px] text-ink-muted transition hover:text-ink-primary">
            ← All templates
          </Link>
          <Badge tone="accent" className="mb-5 mt-4">
            {blueprintCard(blueprint).industryLabel} template
          </Badge>
          <h1 className="font-display text-[34px] leading-tight text-ink-primary">
            Tell Lumen about <em className="italic text-accent">your business.</em>
          </h1>
          <p className="mt-3 max-w-lg text-sm text-ink-secondary">
            {blueprint.name} already decides the pages, the sections and the design —{' '}
            {blueprintCard(blueprint).sections} sections across {blueprintCard(blueprint).pages} pages.
            So there is no prompt to get right: say what the business is, and Lumen asks the rest one
            question at a time.
          </p>
          {/* What they chose, shown rather than named. Somebody who arrived
              from a link has never seen it, and the whole site hangs off it. */}
          <div className="mt-5 overflow-hidden rounded-card border border-hairline">
            <PageThumb
              src={`/api/blueprints/${blueprint.id}/index.html`}
              title={`${blueprint.name} preview`}
              className="aspect-[16/9]"
            />
          </div>
          <p className="mt-2 text-[13px] text-ink-muted">
            <Link href={`/templates/${blueprint.id}`} className="text-accent hover:underline">
              See it full size
            </Link>{' '}
            first, if you like — or{' '}
            <Link href="/templates" className="text-accent hover:underline">
              pick a different one
            </Link>
            .
          </p>
        </div>
      ) : (
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
          Or{' '}
          <Link href="/templates" className="text-accent hover:underline">
            start from a template
          </Link>{' '}
          — it decides the pages and the design, so you only answer questions about your business.
        </p>
      </div>
      )}

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
              {keyStatus ? exhaustedMessage(keyStatus.balance) : null}{' '}
              <Link href="/app/settings/billing" className="text-accent hover:underline">
                See the plan
              </Link>
              .
            </>
          )}
        </div>
      ) : keyStatus ? (
        <div className="mb-6">
          <CreditMeter
            balance={keyStatus.balance}
            resetsAt={keyStatus.resetsAt}
            hasOwnKey={keyStatus.hasOwnKey}
            platformConfigured={keyStatus.platformConfigured}
            variant="panel"
          />
        </div>
      ) : null}

      {blueprint ? (
        <TemplateInterview
          template={{
            id: blueprint.id,
            name: blueprint.name,
            industryLabel: blueprintCard(blueprint).industryLabel,
            businessTypes: blueprint.businessTypes,
            action: blueprint.action,
            sections: blueprintCard(blueprint).sections,
            pages: blueprintCard(blueprint).pages,
          }}
        />
      ) : (
        <Suspense fallback={<div className="h-72" />}>
          <NewSiteForm
            models={{ quality: catalog.quality, fast: catalog.fast, all: catalog.all }}
            defaultModel={user.profile?.default_model ?? null}
            defaultCategory={category ?? user.profile?.onboarding_business_type ?? null}
          />
        </Suspense>
      )}
    </div>
  );
}

import { Suspense } from 'react';
import Link from 'next/link';
import { NewSiteForm } from '@/components/app/NewSiteForm';
import { Badge } from '@/components/ui/Badge';
import { CreditMeter } from '@/components/app/CreditMeter';
import { requireUser } from '@/lib/auth';
import { getKeyStatus, resolveApiKeyForMetadata } from '@/lib/openai/client';
import { fallbackCatalog, getModelCatalog } from '@/lib/openai/models';

export const metadata = { title: 'New site' };
export const dynamic = 'force-dynamic';

export default async function NewSitePage() {
  const user = await requireUser();

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
    ? !keyStatus.hasOwnKey && !keyStatus.unlimited && keyStatus.creditsRemaining < 3
    : false;
  const noKeyAtAll = keyStatus ? !keyStatus.hasOwnKey && !keyStatus.platformConfigured : false;

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="mb-9 text-center">
        <Badge tone="accent" className="mb-5">One prompt</Badge>
        <h1 className="font-display text-[36px] leading-tight text-ink-primary">
          What are we <em className="italic text-accent">building?</em>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-secondary">
          Describe it, upload a screenshot, or say it out loud. Same generator, three ways in.
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
              You do not have enough credits left today for a new site (a build costs 3).{' '}
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
          defaultCategory={user.profile?.onboarding_business_type ?? null}
        />
      </Suspense>
    </div>
  );
}

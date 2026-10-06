import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { StudioCategories } from '@/components/studio/StudioCategories';
import { StudioPrompt } from '@/components/studio/StudioPrompt';
import { StudioEditor } from '@/components/studio/StudioEditor';
import { Scene } from '@/components/studio/Scene';
import { requireUser } from '@/lib/auth';
import { getAllowance } from '@/lib/allowance';
import { planAllows } from '@/lib/plans';
import {
  STUDIO_BLURB,
  STUDIO_HINTS,
  STUDIO_NAME,
  STUDIO_STATUS,
  STUDIO_TAGLINE,
} from '@/lib/studio';

export const metadata = { title: '3D Studio' };
export const dynamic = 'force-dynamic';

/**
 * 3D Studio, inside the app.
 *
 * Shown to everybody rather than hidden from the free tier: a feature nobody
 * can find is a feature nobody upgrades for, and this one is not finished, so
 * there is nothing to withhold yet. What changes with the plan is the line
 * under the title — a Premium account is told it has this coming, everybody
 * else is told what it costs.
 */
export default async function AppStudioPage() {
  const user = await requireUser();
  const allowance = await getAllowance(user.id);
  // planAllows is false for everybody while the feature is marked unbuilt; the
  // tier is what decides whether this account has already paid for it.
  const included = allowance.tier === 'premium' || allowance.unlimited;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="overflow-hidden rounded-card border border-hairline bg-raised">
        <Scene shape="orbit" className="h-52 sm:h-72" tint={['#d7ff3e', '#4f6616']} />
        <div className="p-6 sm:p-8">
          <Badge tone="accent" className="mb-4">{STUDIO_STATUS}</Badge>
          <h1 className="font-display text-[32px] leading-tight text-ink-primary sm:text-[40px]">
            {STUDIO_NAME}
          </h1>
          <p className="mt-3 max-w-xl text-[17px] font-medium leading-snug text-ink-primary">
            {STUDIO_TAGLINE}
          </p>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
            {STUDIO_BLURB}
          </p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {STUDIO_HINTS.map((hint) => (
              <li
                key={hint}
                className="rounded-pill border border-hairline px-3 py-1.5 text-[13.5px] text-ink-secondary"
              >
                {hint}
              </li>
            ))}
          </ul>

          <p className="mt-6 rounded-card border border-accent/25 bg-accent-soft/30 px-4 py-3.5 text-[14.5px] leading-relaxed text-ink-secondary">
            {included
              ? 'You are on Premium, so Studio arrives on your account the day it ships — at no extra cost. Describe what you want below and it will be waiting.'
              : 'Studio is being built, and opens to Premium accounts first. Describe what you want below either way — it is how we decide what to build first.'}
          </p>

          {included ? null : (
            <div className="mt-5">
              <ButtonLink href="/app/settings/billing">See Premium</ButtonLink>
            </div>
          )}
        </div>
      </div>

      <StudioPrompt />
      <StudioCategories />
      <StudioEditor />
    </div>
  );
}

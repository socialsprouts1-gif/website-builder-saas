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
 * can find is a feature nobody upgrades for. Everything on this screen works
 * for everybody — choose a kind, choose a palette, write the brief — and the
 * plan is only mentioned at Build, which is where the server decides. What
 * changes up here is one line and one button: an account with 3D is told it is
 * included, everybody else is told what it costs.
 *
 * `planAllows` rather than a tier comparison, so the founder's own account —
 * which is `admin` and buys nothing — reads as included rather than being
 * shown an upgrade button for a plan it is not on.
 */
export default async function AppStudioPage() {
  const user = await requireUser();
  const allowance = await getAllowance(user.id);
  const included = planAllows(allowance.tier, 'three_d');

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="overflow-hidden rounded-card border border-hairline bg-raised">
        <Scene shape="orbit" className="h-52 sm:h-72" tint={['#d8a0ff', '#5a2d99']} />
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
              ? '3D websites are included on your account. Build as many as you like — they cost the same credits as any other site, and nothing extra.'
              : 'Choose what you want built and write your brief below. 3D websites are on the Premium plan, so the upgrade is offered when you press Build — nothing you type here is lost.'}
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

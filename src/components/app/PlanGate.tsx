import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FEATURES, planFor, priceLabel, tierFor, type Feature } from '@/lib/plans';

/**
 * What somebody sees instead of a feature their plan does not include.
 *
 * Not a locked padlock on a dead page. It says what the feature does, which
 * plan has it and what that costs, and it leaves the rest of the app alone —
 * nothing is hidden from the nav, because a feature you cannot find is not a
 * feature you will ever pay for.
 */
export function PlanGate({ feature, children }: { feature: Feature; children?: React.ReactNode }) {
  const tier = tierFor(feature);
  const plan = planFor(tier, 'monthly');
  const detail = FEATURES[feature];

  return (
    <div className="rounded-card border border-accent/25 bg-accent-soft/30 p-6 text-center">
      <Badge tone="accent" className="mb-4">
        {tier === 'premium' ? 'Premium' : 'Pro'}
      </Badge>
      <h2 className="font-display text-[22px] leading-tight text-ink-primary">{detail.label}</h2>
      {children ? (
        <div className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-secondary">
          {children}
        </div>
      ) : null}
      <p className="mt-4 text-[13px] text-ink-muted">
        On the {tier === 'premium' ? 'Premium' : 'Pro'} plan
        {plan ? `, ${priceLabel(plan)}` : ''}. Everything you have already built is unaffected.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <ButtonLink href="/app/settings/billing">See the plans</ButtonLink>
        <Link href="/pricing" className="text-[12.5px] text-ink-muted transition hover:text-ink-primary">
          What is in each one
        </Link>
      </div>
    </div>
  );
}

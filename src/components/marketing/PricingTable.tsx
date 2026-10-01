'use client';

import { useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { CREDIT_COST, FREE_CREDITS } from '@/lib/env';
import {
  FEATURES,
  FREE_PLAN,
  paidPlans,
  priceLabel,
  savingLabel,
  type BillingPeriod,
} from '@/lib/plans';

/**
 * Three tiers and two billing periods, from the same catalogue the checkout
 * charges from. The page used to print one price in prose, which is fine until
 * there are five and one of them is wrong.
 */
export function PricingTable() {
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const plans = paidPlans(period);

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <div className="flex rounded-pill border border-hairline p-0.5" role="group" aria-label="Billing period">
          {(['monthly', 'yearly'] as BillingPeriod[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              aria-pressed={period === option}
              className={cn(
                'rounded-pill px-5 py-2 text-[13px] capitalize transition',
                period === option ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:text-ink-secondary',
              )}
            >
              {option}
              {option === 'yearly' ? ' · 2 months free' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <article className="flex flex-col rounded-card border border-hairline bg-raised p-7">
          <p className="font-display text-[20px] text-ink-primary">{FREE_PLAN.name}</p>
          <p className="mt-2 font-display text-[36px] leading-none text-ink-primary">₹0</p>
          <p className="mt-2 text-[13px] text-ink-muted">No card, nothing expires</p>
          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-secondary">{FREE_PLAN.note}</p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {[
              `${FREE_CREDITS} credits — ${Math.floor(FREE_CREDITS / CREDIT_COST.generation)} whole websites`,
              'Every feature: shop, chatbot, voice, visual editor, connectors',
              'Publish to a lumensite.in address',
              'Export the code, or push it to your own GitHub',
            ].map((item) => (
              <Line key={item}>{item}</Line>
            ))}
          </ul>
          <ButtonLink href="/signup" variant="secondary" size="lg" className="mt-6 w-full">
            Start free →
          </ButtonLink>
        </article>

        {plans.map((plan) => {
          const saving = savingLabel(plan);
          const best = plan.tier === 'premium';
          return (
            <article
              key={plan.key}
              className={cn(
                'flex flex-col rounded-card border p-7',
                best ? 'border-accent/40 bg-accent-soft/20' : 'border-hairline bg-raised',
              )}
            >
              <p className="font-display text-[20px] text-ink-primary">{plan.name}</p>
              <p className="mt-2 font-display text-[36px] leading-none text-ink-primary">
                {priceLabel(plan)}
              </p>
              <p className="mt-2 text-[13px] text-ink-muted">
                {saving ?? 'Billed monthly in INR · cancel any time'}
              </p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-secondary">{plan.note}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                <Line>
                  <span className="text-ink-primary">{plan.dailyCredits} credits every day</span> — around{' '}
                  {Math.floor(plan.dailyCredits / CREDIT_COST.generation)} new sites a day
                </Line>
                <Line>Everything in Free, with no ceiling on projects or pages</Line>
                {plan.features.map((feature) => (
                  <Line key={feature} soon={FEATURES[feature].soon}>
                    {FEATURES[feature].label}
                    {FEATURES[feature].soon ? (
                      <span className="ml-1.5 rounded-pill border border-hairline px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.1em] text-ink-muted">
                        Coming soon
                      </span>
                    ) : null}
                  </Line>
                ))}
              </ul>
              <ButtonLink
                href="/signup"
                variant={best ? 'primary' : 'secondary'}
                size="lg"
                className="mt-6 w-full"
              >
                Choose {plan.name} →
              </ButtonLink>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Line({ children, soon = false }: { children: React.ReactNode; soon?: boolean }) {
  return (
    <li className={cn('flex gap-3 text-[13.5px] leading-relaxed', soon ? 'text-ink-muted' : 'text-ink-secondary')}>
      <span
        className={cn('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-pill', soon ? 'bg-ink-muted/50' : 'bg-accent')}
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}

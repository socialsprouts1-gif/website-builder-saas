'use client';

import { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import {
  FEATURES,
  FREE_CREDITS_NOTE,
  formatMoney,
  introLabel,
  paidPlans,
  priceLabel,
  savingLabel,
  type BillingPeriod,
  type Currency,
  type Plan,
  type PlanKey,
} from '@/lib/plans';
import { CurrencyToggle } from '@/components/ui/CurrencyToggle';
import { CREDIT_COST } from '@/lib/env';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * The plans, as something you choose between.
 *
 * There was one plan and one button, so the screen could say "Subscribe" and be
 * unambiguous. With two tiers and two billing periods it has to show what the
 * difference actually is — otherwise the premium tier is a bigger number next
 * to the same list, which reads as a worse deal rather than a better one.
 *
 * What is not built yet is labelled. 3D sites are on the premium card because
 * that is where they will land, and a customer paying ₹2,000 this month must
 * not believe they are paying for something that does not exist.
 */
export function PlanPicker({
  currentPlan,
  entitled,
  hasSubscription,
  email,
  existingGstin,
  purchasable,
  intro = [],
  billingConfigured,
}: {
  currentPlan: PlanKey;
  entitled: boolean;
  hasSubscription: boolean;
  email: string;
  existingGstin: string | null;
  /** The plans with a Razorpay plan id behind them on this deployment. */
  purchasable: PlanKey[];
  /** The plans whose introductory offer is actually set up in Razorpay. */
  intro?: PlanKey[];
  billingConfigured: boolean;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [gstin, setGstin] = useState(existingGstin ?? '');
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function subscribe(plan: Plan) {
    setBusy(plan.key);
    setError(null);
    try {
      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: plan.key, gstin: gstin.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not start checkout');

      if (window.Razorpay && payload.keyId) {
        const checkout = new window.Razorpay({
          key: payload.keyId,
          subscription_id: payload.subscriptionId,
          name: 'Lumen',
          description: `${plan.name} — ${priceLabel(plan)}`,
          prefill: { email },
          theme: { color: '#d7ff3e' },
          handler: () => {
            setNotice('Payment received. Your plan activates as soon as Razorpay confirms it.');
            router.refresh();
          },
          modal: { ondismiss: () => setBusy(null) },
        });
        checkout.open();
        return;
      }

      // Checkout script blocked or unavailable — Razorpay's hosted page works.
      if (payload.shortUrl) {
        window.location.href = payload.shortUrl;
        return;
      }
      throw new Error('Checkout could not be opened. Try again, or disable your ad blocker.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start checkout');
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy(currentPlan);
    setError(null);
    try {
      const response = await fetch('/api/billing/cancel', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not cancel');
      setNotice('Cancelled. Your plan stays active until the end of the period you have paid for.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not cancel');
    } finally {
      setBusy(null);
    }
  }

  if (!billingConfigured) {
    return (
      <p className="rounded-card border border-hairline bg-raised px-4 py-3 text-[13px] text-ink-muted">
        Payments are not switched on yet. Add the Razorpay key ID, key secret, webhook secret and a plan
        ID for each plan to the environment.
      </p>
    );
  }

  const plans = paidPlans(period);

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="space-y-6">
        <div className="flex justify-center">
          <CurrencyToggle value={currency} onChange={setCurrency} />
        </div>

        <div className="flex justify-center">
          <div className="flex rounded-pill border border-hairline p-0.5" role="group" aria-label="Billing period">
            {(['monthly', 'yearly'] as BillingPeriod[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                aria-pressed={period === option}
                className={cn(
                  'rounded-pill px-4 py-1.5 text-[12.5px] capitalize transition',
                  period === option ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:text-ink-secondary',
                )}
              >
                {option}
                {option === 'yearly' ? ' — 2 months free' : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => {
            const current = plan.key === currentPlan && entitled;
            const buyable = purchasable.includes(plan.key);
            const saving = savingLabel(plan, currency);
            const offer = intro.includes(plan.key) && !entitled ? plan : null;
            return (
              <div
                key={plan.key}
                className={cn(
                  'flex flex-col rounded-card border p-5',
                  current ? 'border-accent/50 bg-accent-soft/30' : 'border-hairline bg-raised',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-[19px] text-ink-primary">{plan.name}</p>
                  {current ? <Badge tone="accent">Your plan</Badge> : null}
                </div>
                {offer?.introPricePaise ? (
                  <>
                    <p className="mt-1.5 flex flex-wrap items-baseline gap-2">
                      <span className="font-display text-[17px] leading-none text-ink-muted line-through">
                        {formatMoney(plan.pricePaise, currency)}
                      </span>
                      <span className="font-display text-[26px] leading-none text-ink-primary">
                        {formatMoney(offer.introPricePaise, currency)}
                      </span>
                    </p>
                    <p className="mt-1.5 text-[12px] text-accent">{introLabel(plan, currency)}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1.5 font-display text-[26px] leading-none text-ink-primary">
                      {priceLabel(plan, currency)}
                    </p>
                    {saving ? <p className="mt-1.5 text-[12px] text-accent">{saving}</p> : null}
                  </>
                )}
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-secondary">{plan.note}</p>

                <ul className="mt-4 flex-1 space-y-2 text-[12.5px] leading-relaxed text-ink-secondary">
                  {plan.highlights.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className={FEATURES[feature].soon ? 'text-ink-muted' : 'text-accent'}>
                        {FEATURES[feature].soon ? '◦' : '✓'}
                      </span>
                      <span>
                        {FEATURES[feature].label}
                        {FEATURES[feature].soon ? (
                          <span className="ml-1.5 rounded-pill border border-hairline px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.1em] text-ink-muted">
                            Coming
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  {current ? (
                    <Button variant="danger" onClick={cancel} disabled={busy !== null} className="w-full">
                      {busy ? 'Cancelling…' : 'Cancel'}
                    </Button>
                  ) : buyable ? (
                    <Button
                      onClick={() => void subscribe(plan)}
                      disabled={busy !== null}
                      className="w-full"
                      variant={plan.tier === 'premium' ? 'primary' : 'secondary'}
                    >
                      {busy === plan.key
                        ? 'Opening checkout…'
                        : entitled
                          ? `Switch to ${plan.name}`
                          : `Choose ${plan.name}`}
                    </Button>
                  ) : (
                    <p className="rounded-[10px] border border-dashed border-hairline px-3 py-2.5 text-center text-[12px] text-ink-muted">
                      Not set up in Razorpay yet
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!entitled || !hasSubscription ? (
          <Field
            label="GSTIN (optional)"
            hint="Add this and every invoice is issued as a GST-compliant tax invoice."
          >
            <Input
              value={gstin}
              onChange={(event) => setGstin(event.target.value.toUpperCase())}
              placeholder="27ABCDE1234F1Z5"
              maxLength={15}
            />
          </Field>
        ) : null}

        <p className="text-center text-[12px] leading-relaxed text-ink-muted">
          {currency === 'USD'
            ? 'Dollar amounts are approximate — every charge is made in Indian rupees through Razorpay. '
            : ''}
          {FREE_CREDITS_NOTE}
        </p>

        {error ? (
          <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3.5 py-2.5 text-[13px] text-[#e5735a]">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-[10px] border border-accent/30 bg-accent-soft px-3.5 py-2.5 text-[13px] text-accent">
            {notice}
          </p>
        ) : null}
      </div>
    </>
  );
}

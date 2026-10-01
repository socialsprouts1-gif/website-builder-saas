'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CREDIT_COST, FREE_CREDITS } from '@/lib/env';
import { FEATURES, FREE_CREDITS_NOTE, paidPlans, priceLabel } from '@/lib/plans';

/**
 * The moment the free credits run out.
 *
 * Before this, running out was a red sentence at the bottom of whatever screen
 * you were on, and the way to carry on was a settings page nothing linked to.
 * The free tier is now a grant that ends, so the end of it has to be a proper
 * moment: what ran out, what it costs to carry on, what happens if you do not,
 * and a button that starts the payment rather than a link to a page about it.
 *
 * It is not a wall. Everything already built stays live, stays published and
 * stays exportable, and the dialog says so — closing it is always allowed.
 */
export const CREDITS_EXHAUSTED_EVENT = 'lumen:credits-exhausted';

/** Raised from anywhere a request comes back 402. */
export function signalCreditsExhausted(message?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CREDITS_EXHAUSTED_EVENT, { detail: { message } }));
}

/**
 * A fetch that turns "out of credits" into the dialog instead of into a
 * sentence each caller has to write. Returns the parsed body either way, so
 * every existing error path still works.
 */
export async function postJson<T = Record<string, unknown>>(
  url: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; payload: T }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; code?: string };
  // Out of credits, or on a plan that does not include what was asked for.
  // Both have the same answer, so both open the same dialog.
  if (response.status === 402 || response.status === 403) {
    if (payload.code === 'credits_exhausted' || payload.code === 'plan_required') {
      signalCreditsExhausted(payload.error);
    }
  }
  return { ok: response.ok, status: response.status, payload };
}

/**
 * Opens the dialog on arrival, for a screen somebody cannot use yet.
 *
 * Rendered by the new-site page when the balance will not cover a build: being
 * told after writing a prompt and answering four questions is the version of
 * this that wastes somebody's afternoon.
 */
export function OpenUpgradeWhenBlocked({ blocked, message }: { blocked: boolean; message?: string }) {
  useEffect(() => {
    if (blocked) signalCreditsExhausted(message);
  }, [blocked, message]);
  return null;
}

export function UpgradeDialog({ openOnMount = false }: { openOnMount?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(openOnMount);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function onExhausted(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setMessage(detail?.message ?? null);
      setOpen(true);
    }
    window.addEventListener(CREDITS_EXHAUSTED_EVENT, onExhausted);
    return () => window.removeEventListener(CREDITS_EXHAUSTED_EVENT, onExhausted);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-card border border-hairline bg-[var(--surface-raised)] shadow-2xl">
        <div className="border-b border-hairline px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Out of credits</p>
          <h2 id="upgrade-title" className="mt-1.5 font-display text-[22px] leading-tight text-ink-primary">
            Pick a plan and carry on
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            {message ??
              `Your ${FREE_CREDITS} free credits are used up. ${FREE_CREDITS_NOTE}`}
          </p>
        </div>

        {/* The same two cards as the billing screen, read from the same
            catalogue, so the dialog can never offer a price the checkout does
            not charge. Monthly here: choosing a year is a decision for a page
            with room to explain it. */}
        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          {paidPlans('monthly').map((plan) => (
            <div key={plan.key} className="rounded-card border border-hairline p-4">
              <p className="font-display text-[17px] text-ink-primary">{plan.name}</p>
              <p className="mt-0.5 font-display text-[21px] leading-none text-ink-primary">
                {priceLabel(plan)}
              </p>
              <ul className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-ink-secondary">
                <li>
                  <span className="text-ink-primary">{plan.dailyCredits} credits a day</span> — about{' '}
                  {Math.floor(plan.dailyCredits / CREDIT_COST.generation)} sites
                </li>
                {plan.features.map((feature) => (
                  <li key={feature} className={FEATURES[feature].soon ? 'text-ink-muted' : undefined}>
                    {FEATURES[feature].label}
                    {FEATURES[feature].soon ? ' (coming)' : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-6 py-4">
          <Button onClick={() => { close(); router.push('/app/settings/billing'); }}>
            See the plans
          </Button>
          <Button variant="secondary" onClick={close}>
            Not now
          </Button>
          <Link
            href="/app/settings/api-keys"
            className="ml-auto text-[12.5px] text-ink-muted transition hover:text-ink-primary"
            onClick={close}
          >
            Or use your own OpenAI key
          </Link>
        </div>
      </div>
    </div>
  );
}

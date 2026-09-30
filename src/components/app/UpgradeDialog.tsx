'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CREDIT_COST, FREE_CREDITS, PLAN_PRICE_LABEL, PRO_DAILY_PLATFORM_CREDITS } from '@/lib/env';

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
  if (response.status === 402 || payload.code === 'credits_exhausted') {
    signalCreditsExhausted(payload.error);
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  /**
   * Straight to Razorpay. A dialog whose main button opens another page about
   * the thing it is already explaining is a dialog nobody finishes.
   */
  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { shortUrl?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not start the subscription.');
      if (payload.shortUrl) {
        window.location.href = payload.shortUrl;
        return;
      }
      // Configured, created, but no hosted page came back — the billing screen
      // can always finish it.
      router.push('/app/settings/billing');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the subscription.');
      setBusy(false);
    }
  }

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
      <div className="w-full max-w-md overflow-hidden rounded-card border border-hairline bg-[var(--surface-raised)] shadow-2xl">
        <div className="border-b border-hairline px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Out of credits</p>
          <h2 id="upgrade-title" className="mt-1.5 font-display text-[22px] leading-tight text-ink-primary">
            Keep building for {PLAN_PRICE_LABEL} a month
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            {message ??
              `Your ${FREE_CREDITS} free credits are used up. Everything you have built stays live, published and exportable — only new generating stops.`}
          </p>
        </div>

        <ul className="space-y-2.5 px-6 py-5 text-[13px] leading-relaxed text-ink-secondary">
          <li className="flex gap-2.5">
            <span className="text-accent">✓</span>
            <span>
              <span className="text-ink-primary">{PRO_DAILY_PLATFORM_CREDITS} credits every day</span> — about{' '}
              {Math.floor(PRO_DAILY_PLATFORM_CREDITS / CREDIT_COST.generation)} new sites a day, or one site
              and an afternoon of changes.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-accent">✓</span>
            <span>Your own domain with HTTPS, and GST invoices.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-accent">✓</span>
            <span>Cancel in one click. It runs to the end of the month you paid for.</span>
          </li>
        </ul>

        {error ? (
          <p className="mx-6 mb-4 rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[12.5px] text-[#e5735a]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-6 py-4">
          <Button onClick={() => void subscribe()} disabled={busy}>
            {busy ? 'Opening Razorpay…' : `Upgrade — ${PLAN_PRICE_LABEL}/month`}
          </Button>
          <Button variant="secondary" onClick={close} disabled={busy}>
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

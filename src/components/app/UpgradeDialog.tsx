'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
): Promise<{ ok: boolean; status: number; blocked: boolean; payload: T }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; code?: string };
  // Out of credits, or on a plan that does not include what was asked for.
  // Both have the same answer, so both open the same dialog.
  const blocked =
    (response.status === 402 || response.status === 403) &&
    (payload.code === 'credits_exhausted' || payload.code === 'plan_required');
  if (blocked) signalCreditsExhausted(payload.error);

  return { ok: response.ok, status: response.status, blocked, payload };
}

/**
 * Where the dialog stays out of the way.
 *
 * Everywhere else in the app it opens on arrival, because somebody whose free
 * credits are gone needs to be told rather than left to discover it. These two
 * are the exception: the new-site screen is where somebody writes their brief
 * and answers the questions, and they are allowed to do all of that. The wall
 * comes at the end, when they press Build — which is the moment the work is
 * real to them and the plan is worth something.
 *
 * The project screen is the other: an account out of credits can still read,
 * publish and hand-edit everything it has already built, and a dialog over the
 * top of that would be taking away what it promised to leave alone.
 */
const QUIET = ['/app/new', '/app/project'];

export function UpgradeDialog({ blocked = false }: { blocked?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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

  /**
   * On every page, every time, while the account has nothing left.
   *
   * Deliberately not remembered across navigations: closing it means "not on
   * this screen", not "never ask me again". An account that cannot build
   * anything is an account with nothing to do in here, and the one thing it can
   * do should be in front of it.
   */
  useEffect(() => {
    if (!blocked) return;
    if (QUIET.some((prefix) => pathname.startsWith(prefix))) return;
    setMessage(null);
    setOpen(true);
  }, [blocked, pathname]);

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
      {/* Capped and scrollable, because on a phone the two plan cards are
          taller than the screen and a dialog whose heading and buttons are
          both off the edge is a trap rather than an offer. */}
      <div className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-hairline bg-[var(--surface-raised)] shadow-2xl">
        <div className="shrink-0 border-b border-hairline px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Free credits used</p>
          <h2 id="upgrade-title" className="mt-1.5 font-display text-[22px] leading-tight text-ink-primary">
            Choose a plan to keep building
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            {message ??
              `You have used all ${FREE_CREDITS} free credits, so Lumen cannot build anything new yet. ${FREE_CREDITS_NOTE}`}
          </p>
        </div>

        {/* The same two cards as the billing screen, read from the same
            catalogue, so the dialog can never offer a price the checkout does
            not charge. Monthly here: choosing a year is a decision for a page
            with room to explain it. */}
        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          {paidPlans('monthly').map((plan) => (
            <div key={plan.key} className="rounded-card border border-hairline p-4">
              <p className="font-display text-[17px] text-ink-primary">{plan.name}</p>
              <p className="mt-0.5 font-display text-[21px] leading-none text-ink-primary">
                {priceLabel(plan)}
              </p>
              <ul className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-ink-secondary">
                {plan.highlights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
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

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-hairline px-6 py-4">
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

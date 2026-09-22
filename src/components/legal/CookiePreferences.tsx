'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

/**
 * Cookie preferences, without the pretence.
 *
 * Most consent screens offer toggles for categories the site does not use, so
 * that switching them off feels like it did something. Lumen sets session
 * cookies to keep you signed in and nothing else — no analytics, no
 * advertising, no cross-site anything — so there is genuinely nothing to
 * switch off that would leave a working product.
 *
 * Rather than three dead toggles, this says what is set, shows the handful of
 * preferences the app keeps in your own browser, and gives you a button that
 * really clears them. An honest empty state beats a convincing fake one.
 */

interface Category {
  name: string;
  state: 'always-on' | 'none';
  detail: string;
}

const CATEGORIES: Category[] = [
  {
    name: 'Strictly necessary',
    state: 'always-on',
    detail:
      'Session cookies from our authentication provider, which tell us which account this browser is signed into. Without them you would be signed out on every page, so they cannot be turned off.',
  },
  {
    name: 'Analytics',
    state: 'none',
    detail:
      'None. Views of published sites are counted with a one-way daily hash of the visitor’s address and browser. No cookie is set and the hash cannot be traced back to a person.',
  },
  {
    name: 'Advertising and tracking',
    state: 'none',
    detail: 'None. Lumen runs no ad network, no retargeting, and no cross-site tracking.',
  },
  {
    name: 'Preferences',
    state: 'none',
    detail:
      'Not cookies. A few small values are kept in your browser’s own storage — the last language you used for voice input, whether you dismissed a tip. They never leave your device and we cannot read them.',
  },
];

/** The keys the app writes to the browser's own storage. */
const OWN_PREFIXES = ['lumen.', 'lumen-'];

export function CookiePreferences() {
  const [stored, setStored] = useState<string[] | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    setStored(readOwnKeys());
  }, []);

  function clear() {
    for (const key of readOwnKeys()) {
      try {
        localStorage.removeItem(key);
      } catch {
        // A browser that refuses storage has nothing to clear.
      }
    }
    setStored([]);
    setCleared(true);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <Link href="/legal" className="text-[13px] text-ink-muted transition hover:text-ink-primary">
        ← All policies
      </Link>

      <h1 className="mt-5 font-display text-[34px] leading-tight text-ink-primary sm:text-[40px]">
        Cookie Preferences
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">
        There are no toggles on this page, because there is nothing here worth pretending about:
        Lumen sets the cookies it needs to keep you signed in, and no others.
      </p>

      <div className="mt-10 space-y-3">
        {CATEGORIES.map((category) => (
          <div key={category.name} className="rounded-card border border-hairline bg-raised p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] text-ink-primary">{category.name}</p>
              <span
                className={cn(
                  'rounded-pill border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.1em]',
                  category.state === 'always-on'
                    ? 'border-accent/45 bg-accent-soft text-accent'
                    : 'border-hairline text-ink-muted',
                )}
              >
                {category.state === 'always-on' ? 'Always on' : 'None used'}
              </span>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{category.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-card border border-hairline p-4 sm:p-5">
        <p className="text-[15px] text-ink-primary">What this browser is holding for Lumen</p>

        {stored === null ? (
          <p className="mt-2 text-[13.5px] text-ink-muted">Checking…</p>
        ) : stored.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-muted">
            {cleared ? 'Cleared. Nothing of ours is left in this browser’s storage.' : 'Nothing.'}
          </p>
        ) : (
          <>
            <ul className="mt-3 space-y-1.5">
              {stored.map((key) => (
                <li key={key} className="font-mono text-[12.5px] text-ink-secondary">
                  {key}
                </li>
              ))}
            </ul>
            <Button size="sm" variant="secondary" className="mt-4" onClick={clear}>
              Clear these
            </Button>
          </>
        )}

        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
          Signing out clears the session cookies. Clearing site data in your browser clears
          everything, and will sign you out.
        </p>
      </div>

      <p className="mt-10 text-[13.5px] leading-relaxed text-ink-secondary">
        The full detail is in the{' '}
        <Link href="/legal/cookie-policy" className="text-accent hover:underline">
          Cookie Policy
        </Link>
        , and what we do with everything else is in the{' '}
        <Link href="/legal/privacy-policy" className="text-accent hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function readOwnKeys(): string[] {
  try {
    return Object.keys(localStorage)
      .filter((key) => OWN_PREFIXES.some((prefix) => key.startsWith(prefix)))
      .sort();
  } catch {
    // Private browsing, or storage blocked. Nothing readable is nothing to show.
    return [];
  }
}

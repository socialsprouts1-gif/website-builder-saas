'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

/**
 * What the tool is, for somebody who has never used one.
 *
 * Lumen assumes a lot: that "Workspace" and "Editor" mean different things,
 * that the preview on the right is a real website, that publishing is a
 * separate act from building. None of that is obvious, and the complaint was
 * exactly this — new people cannot tell what to do next.
 *
 * Deliberately not a tour with a mask and a spotlight. Those are hard to read,
 * impossible to resume, and the first thing anybody closes. This is five
 * cards explaining the five things, dismissible for good, reachable again from
 * the question mark — which is what somebody actually wants on day two.
 */

const SEEN = 'lumen-first-run-seen';

interface Step {
  n: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    n: '1',
    title: 'Describe the business',
    body: 'One sentence is enough — "a leather bag shop in Jaipur". Lumen asks a few short questions about it, then writes the whole site: pages, words and pictures.',
  },
  {
    n: '2',
    title: 'Watch it appear',
    body: 'The preview on the right fills in page by page as it is written. You can look at it while it works — nothing is hidden until the end.',
  },
  {
    n: '3',
    title: 'Change anything by asking',
    body: 'Type what you want into the box at the bottom: "make the hero darker", "add a page about delivery". That is the Workspace. For moving things by hand, open the Editor.',
  },
  {
    n: '4',
    title: 'Put it online',
    body: 'Publish gives it a real address anybody can open. Until you press it, only you can see it. You can publish as many times as you like.',
  },
  {
    n: '5',
    title: 'Let it answer customers',
    body: 'Every site gets a chat bubble that already knows what is on its pages. Connectors send enquiries to your WhatsApp or email.',
  },
];

export function FirstRun({
  force = false,
  onClose,
}: {
  /** Shown because somebody asked for it, rather than because it is their first visit. */
  force?: boolean;
  onClose?: () => void;
}) {
  // Starts closed and opens from an effect, never from the first render: on
  // the server there is no localStorage, and a panel that renders open and
  // then vanishes is worse than one that arrives a frame late.
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (force) {
      setOpen(true);
      return;
    }
    try {
      if (!localStorage.getItem(SEEN)) setOpen(true);
    } catch {
      // Private browsing, or storage blocked. Showing it every time is the
      // safer failure: an explanation nobody needed beats a tool nobody
      // understands.
      setOpen(true);
    }
  }, [force]);

  function close() {
    setOpen(false);
    setStep(0);
    try {
      localStorage.setItem(SEEN, '1');
    } catch {
      /* nothing to do, and nothing worth telling anybody about */
    }
    onClose?.();
  }

  if (!open) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-hairline bg-[var(--surface-raised)] shadow-2xl">
        <div className="flex items-start gap-4 border-b border-hairline px-6 py-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-accent-soft font-display text-[18px] text-accent">
            {current.n}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] uppercase tracking-[0.16em] text-accent">
              Getting started · {step + 1} of {STEPS.length}
            </p>
            <h2
              id="first-run-title"
              className="mt-1 font-display text-[23px] leading-tight text-ink-primary"
            >
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-1 shrink-0 rounded-[8px] px-2 py-1 text-[20px] leading-none text-ink-muted transition hover:text-ink-primary"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-[16px] leading-relaxed text-ink-secondary">{current.body}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-hairline px-6 py-4">
          <ul className="flex gap-1.5" aria-hidden>
            {STEPS.map((entry, index) => (
              <li
                key={entry.n}
                className={cn(
                  'h-1.5 rounded-pill transition-all',
                  index === step ? 'w-5 bg-accent' : 'w-1.5 bg-white/20',
                )}
              />
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            {step > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : null}
            {last ? (
              <Button size="sm" onClick={close}>
                Build my first site
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-hairline px-6 py-3">
          <Link
            href="/help"
            className="text-[14px] text-ink-muted underline underline-offset-4 transition hover:text-ink-primary"
          >
            Or read the longer guide
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Opens it again, for somebody who closed it and wants it back. */
export function FirstRunButton() {
  // A count rather than a flag, and used as the key: unmounting on close is
  // what makes the second click work. With a flag it opened once and then the
  // button was dead, because nothing about the state changed on the way back.
  const [opened, setOpened] = useState(0);
  const [showing, setShowing] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpened((count) => count + 1);
          setShowing(true);
        }}
        className="text-left text-[14px] text-ink-muted transition hover:text-ink-primary"
      >
        How Lumen works
      </button>
      {showing ? <FirstRun key={opened} force onClose={() => setShowing(false)} /> : null}
    </>
  );
}

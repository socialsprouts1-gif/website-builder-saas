'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * What to do with a site that has just been built.
 *
 * Everything here already existed — behind tabs called Chatbot, Connectors and
 * Deploy, which say what the feature is rather than what it gets you. Someone
 * who has just watched their website appear does not go looking through tabs;
 * they need to be told, once, at the moment it is finished, that they can put
 * it online, have it answer customers, and take money on it.
 */

interface Step {
  key: string;
  title: string;
  body: string;
  action: string;
  href?: string;
  mark: React.ReactNode;
}

const STEPS: (projectId: string) => Step[] = (projectId) => [
  {
    key: 'publish',
    mark: <GlobeMark />,
    title: 'Put it online',
    body: 'Get a link you can send to anyone — on WhatsApp, in a bio, on a card. No domain needed yet.',
    action: 'Publish',
  },
  {
    key: 'chatbot',
    mark: <ChatMark />,
    title: 'Let it answer customers',
    body: 'A chat bubble that answers questions from your own pages, at 2am, in your words. Lumen puts it on the site for you.',
    action: 'Set it up',
    href: `/app/project/${projectId}/chatbot`,
  },
  {
    key: 'payments',
    mark: <CardMark />,
    title: 'Take payments',
    body: 'Connect Razorpay or Stripe and take bookings, deposits and orders straight from the site.',
    action: 'Connect',
    href: `/app/project/${projectId}/connectors`,
  },
  {
    key: 'domain',
    mark: <TagMark />,
    title: 'Use your own domain',
    body: 'Point a domain you own at this site, or buy one — your name instead of ours.',
    action: 'Set up domain',
    href: `/app/project/${projectId}/deploy`,
  },
];

export function NextSteps({
  projectId,
  open,
  onClose,
  onPublish,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onPublish: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Your site is ready"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="lumen-panel max-h-full w-full max-w-lg overflow-y-auto rounded-[20px] border border-hairline p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Your site is ready</p>
            <h2 className="mt-1.5 font-display text-[22px] leading-tight text-ink-primary">
              Now make it earn its keep
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-pill px-2 py-1 text-[18px] leading-none text-ink-muted transition hover:text-ink-primary"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-2.5">
          {STEPS(projectId).map((step) =>
            step.href ? (
              <Link
                key={step.key}
                href={step.href}
                onClick={onClose}
                className="lumen-raise flex items-center gap-4 rounded-[14px] border border-hairline p-4 hover:border-accent/40"
              >
                <StepBody step={step} />
              </Link>
            ) : (
              <button
                key={step.key}
                type="button"
                onClick={() => {
                  onClose();
                  onPublish();
                }}
                className="lumen-raise flex w-full items-center gap-4 rounded-[14px] border border-accent/40 bg-accent-soft p-4 text-left hover:border-accent"
              >
                <StepBody step={step} highlight />
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full text-[12.5px] text-ink-muted transition hover:text-ink-secondary"
        >
          Not now — I want to keep editing
        </button>
      </div>
    </div>
  );
}

function StepBody({ step, highlight }: { step: Step; highlight?: boolean }) {
  return (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] ${
          highlight ? 'lumen-tile' : 'lumen-well border border-hairline text-ink-secondary'
        }`}
        aria-hidden
      >
        {step.mark}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[14px] ${highlight ? 'text-accent' : 'text-ink-primary'}`}>{step.title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{step.body}</p>
      </div>
      <span
        className={`shrink-0 rounded-pill px-3 py-1.5 text-[11.5px] uppercase tracking-[0.1em] ${
          highlight ? 'lumen-key' : 'border border-hairline text-ink-secondary'
        }`}
      >
        {step.action}
      </span>
    </>
  );
}

/* Line marks rather than glyphs: they take the accent colour from the tile and
   stay legible at 17px. */
const STROKE = { stroke: 'currentColor', strokeWidth: 1.3, fill: 'none' } as const;

function GlobeMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r="7" {...STROKE} />
      <path d="M3 10h14M10 3c2.2 2.4 2.2 11.6 0 14M10 3C7.8 5.4 7.8 14.6 10 17" {...STROKE} />
    </svg>
  );
}

function ChatMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden>
      <path d="M3.5 5.5A2 2 0 0 1 5.5 3.5h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-3.5 3v-3a1 1 0 0 1-1-1v-7Z" {...STROKE} strokeLinejoin="round" />
      <path d="M7 7.5h6M7 10h4" {...STROKE} strokeLinecap="round" />
    </svg>
  );
}

function CardMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden>
      <rect x="2.5" y="5" width="15" height="10" rx="2" {...STROKE} />
      <path d="M2.5 8.5h15M5.5 12h3" {...STROKE} strokeLinecap="round" />
    </svg>
  );
}

function TagMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden>
      <path d="M10.5 2.5H16a1.5 1.5 0 0 1 1.5 1.5v5.5a2 2 0 0 1-.6 1.4l-5.6 5.6a1.5 1.5 0 0 1-2.1 0l-5.6-5.6a1.5 1.5 0 0 1 0-2.1l5.6-5.6a2 2 0 0 1 1.3-.7Z" {...STROKE} strokeLinejoin="round" />
      <circle cx="13.5" cy="6.5" r="1.2" {...STROKE} />
    </svg>
  );
}

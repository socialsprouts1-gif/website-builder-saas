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
}

const STEPS: (projectId: string) => Step[] = (projectId) => [
  {
    key: 'publish',
    title: 'Put it online',
    body: 'Get a link you can send to anyone — on WhatsApp, in a bio, on a card. No domain needed yet.',
    action: 'Publish',
  },
  {
    key: 'chatbot',
    title: 'Let it answer customers',
    body: 'A chat bubble that answers questions from your own pages, at 2am, in your words. Lumen puts it on the site for you.',
    action: 'Set it up',
    href: `/app/project/${projectId}/chatbot`,
  },
  {
    key: 'payments',
    title: 'Take payments',
    body: 'Connect Razorpay or Stripe and take bookings, deposits and orders straight from the site.',
    action: 'Connect',
    href: `/app/project/${projectId}/connectors`,
  },
  {
    key: 'domain',
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
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-[16px] border border-hairline bg-raised p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Your site is ready</p>
            <h2 className="mt-1.5 font-display text-[22px] leading-tight text-ink-primary">
              Three things that make it earn its keep
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
                className="flex items-center gap-4 rounded-[12px] border border-hairline bg-[var(--bg-base-deep)] p-4 transition hover:border-accent/40"
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
                className="flex w-full items-center gap-4 rounded-[12px] border border-accent/40 bg-accent-soft p-4 text-left transition hover:border-accent"
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
      <div className="min-w-0 flex-1">
        <p className={`text-[14px] ${highlight ? 'text-accent' : 'text-ink-primary'}`}>{step.title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{step.body}</p>
      </div>
      <span
        className={`shrink-0 rounded-pill px-3 py-1.5 text-[11.5px] uppercase tracking-[0.1em] ${
          highlight ? 'bg-accent text-[#12140b]' : 'border border-hairline text-ink-secondary'
        }`}
      >
        {step.action}
      </span>
    </>
  );
}

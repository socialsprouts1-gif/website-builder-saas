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

/**
 * Things worth adding, as sentences the chat already understands.
 *
 * Suggestions rather than buttons wired to new code: every one of these is an
 * ordinary edit, so the list can say what a small business actually wants on a
 * site without any of it having to be built as a special case. Picking one puts
 * the sentence in the chat and sends it.
 */
const IDEAS: { label: string; prompt: string }[] = [
  {
    label: 'WhatsApp button',
    prompt:
      'Add a floating WhatsApp enquiry button to every page that opens a chat with our number, with a short pre-filled message.',
  },
  {
    label: 'Enquiry form',
    prompt: 'Add a contact form to the contact page with name, phone, and message, and show it in the footer too.',
  },
  {
    label: 'Photo gallery',
    prompt: 'Add a photo gallery section to the homepage in a responsive grid, with a caption under each picture.',
  },
  {
    label: 'Opening hours',
    prompt: 'Add an opening hours block to the footer and the contact page, laid out day by day.',
  },
  {
    label: 'Customer reviews',
    prompt: 'Add a testimonials section with three customer reviews in cards, with names and star ratings.',
  },
  {
    label: 'Google map',
    prompt: 'Add an embedded Google map of our address to the contact page, under the address.',
  },
  {
    label: 'Price list',
    prompt: 'Add a pricing section with three clear tiers, each with what is included and a call to action.',
  },
  {
    label: 'FAQ',
    prompt: 'Add a frequently asked questions section with six questions and answers that expand when clicked.',
  },
];

export function NextSteps({
  projectId,
  open,
  onClose,
  onPublish,
  onSuggest,
  photos,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onPublish: () => void;
  /** Sends an idea to the chat as an ordinary edit. */
  onSuggest?: (prompt: string) => void;
  /** The upload control, passed in because the uploading belongs to the page. */
  photos?: React.ReactNode;
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

        {photos ? (
          <div className="mt-5 rounded-[14px] border border-hairline bg-raised p-4">
            <p className="text-[13.5px] text-ink-primary">Put your own photos in it</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
              The pictures on the site are stand-ins. Add your logo and a few real photographs and Lumen
              swaps them in — this is the single biggest difference between a site that looks generic and
              one that looks like yours.
            </p>
            <div className="mt-3">{photos}</div>
          </div>
        ) : null}

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

        {onSuggest ? (
          <div className="mt-6 border-t border-hairline pt-5">
            <p className="text-[13.5px] text-ink-primary">Or add something to the site</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
              Tap one and Lumen makes the change. You can undo it from the version history.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {IDEAS.map((idea) => (
                <button
                  key={idea.label}
                  type="button"
                  onClick={() => {
                    onClose();
                    onSuggest(idea.prompt);
                  }}
                  className="rounded-pill border border-hairline px-3 py-1.5 text-[12px] text-ink-secondary transition hover:border-accent/45 hover:text-accent"
                >
                  {idea.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

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

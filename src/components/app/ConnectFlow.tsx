'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectorMark } from '@/components/app/ConnectorMark';
import { BUILT_IN_PROVIDERS, type ConnectIntent } from '@/lib/connectors/intent';
import { DEFAULT_PAY_LABEL, normalisePaymentUrl } from '@/lib/payments';
import type { ConnectorCard } from '@/lib/connectors/registry';

/**
 * "Connect a payment gateway" answered as a form, not a paragraph.
 *
 * Always the same three beats, whatever the integration: which one do you use,
 * then what it needs from you, then it is on. Nothing here asks anyone to read
 * documentation, find a tab, or paste code — the fields come from the connector
 * registry, so an integration added later gets this flow without a UI change.
 */

type Step =
  | { at: 'choose' }
  | { at: 'form'; provider: string }
  | { at: 'done'; provider: string; message: string };

/** The two things Lumen does itself, described like any other provider. */
const BUILT_IN: Record<string, { name: string; summary: string }> = {
  [BUILT_IN_PROVIDERS.paymentLink]: {
    name: 'A payment link',
    summary:
      'Easiest. Make a link in Razorpay, Stripe, PayPal or your UPI app and paste it — no keys, money goes straight to you.',
  },
  [BUILT_IN_PROVIDERS.chatbot]: {
    name: "Lumen's assistant",
    summary: 'Answers from your own pages. Lumen puts the bubble on the site for you.',
  },
};

export function ConnectFlow({
  projectId,
  intent,
  onDismiss,
  onEditInstead,
}: {
  projectId: string;
  intent: ConnectIntent;
  onDismiss: () => void;
  /** "No, I meant change the website" — hands the message back to the editor. */
  onEditInstead: () => void;
}) {
  const router = useRouter();
  const [cards, setCards] = useState<ConnectorCard[] | null>(null);
  const [step, setStep] = useState<Step>({ at: 'choose' });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/connectors?projectId=${encodeURIComponent(projectId)}`)
      .then((response) => (response.ok ? response.json() : { cards: [] }))
      .then((payload) => {
        if (live) setCards(payload.cards ?? []);
      })
      .catch(() => {
        if (live) setCards([]);
      });
    return () => {
      live = false;
    };
  }, [projectId]);

  const byProvider = useMemo(() => {
    const map = new Map<string, ConnectorCard>();
    for (const card of cards ?? []) map.set(card.provider, card);
    return map;
  }, [cards]);

  const offered = useMemo(() => {
    if (showAll) {
      const rest = (cards ?? [])
        .map((card) => card.provider)
        .filter((provider) => !intent.providers.includes(provider));
      return [...intent.providers, ...rest];
    }
    return intent.providers.filter(
      (provider) => provider in BUILT_IN || byProvider.has(provider) || cards === null,
    );
  }, [byProvider, cards, intent.providers, showAll]);

  function describe(provider: string): { name: string; summary: string; connected: boolean } {
    const built = BUILT_IN[provider];
    if (built) return { ...built, connected: false };
    const card = byProvider.get(provider);
    return {
      name: card?.name ?? provider,
      summary: card?.summary ?? '',
      connected: card?.status.connected ?? false,
    };
  }

  return (
    <div className="lumen-panel rounded-[16px] border border-accent/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13.5px] text-ink-primary">
          {step.at === 'choose' ? intent.title : describe(currentProvider(step)).name}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="-mr-1 -mt-1 shrink-0 text-[16px] leading-none text-ink-muted transition hover:text-ink-primary"
        >
          ×
        </button>
      </div>

      {step.at === 'choose' ? (
        <>
          <div className="mt-3 space-y-2">
            {cards === null ? (
              <p className="text-[12.5px] text-ink-muted">Loading the options…</p>
            ) : (
              offered.map((provider) => {
                const info = describe(provider);
                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setStep({ at: 'form', provider })}
                    className="lumen-raise flex w-full items-center gap-3 rounded-[12px] border border-hairline p-3 text-left hover:border-accent/40"
                  >
                    <ConnectorMark provider={provider} name={info.name} connected={info.connected} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-ink-primary">{info.name}</span>
                      {info.summary ? (
                        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-muted">
                          {info.summary}
                        </span>
                      ) : null}
                    </span>
                    {info.connected ? (
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-accent">
                        Connected
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            {!showAll ? (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-[11.5px] text-ink-muted transition hover:text-ink-secondary"
              >
                Something else →
              </button>
            ) : null}
            <button
              type="button"
              onClick={onEditInstead}
              className="text-[11.5px] text-ink-muted transition hover:text-ink-secondary"
            >
              No — change the website instead
            </button>
          </div>
        </>
      ) : null}

      {step.at === 'form' ? (
        <ProviderForm
          projectId={projectId}
          provider={step.provider}
          card={byProvider.get(step.provider) ?? null}
          onBack={() => setStep({ at: 'choose' })}
          onDone={(message) => setStep({ at: 'done', provider: step.provider, message })}
          onNavigate={(href) => router.push(href)}
        />
      ) : null}

      {step.at === 'done' ? (
        <div className="mt-3">
          <p className="text-[12.5px] leading-relaxed text-ink-secondary">{step.message}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="lumen-key mt-3 rounded-pill px-4 py-1.5 text-[12px]"
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}

function currentProvider(step: Step): string {
  return step.at === 'choose' ? '' : step.provider;
}

// ---------------------------------------------------------------- step two --

function ProviderForm({
  projectId,
  provider,
  card,
  onBack,
  onDone,
  onNavigate,
}: {
  projectId: string;
  provider: string;
  card: ConnectorCard | null;
  onBack: () => void;
  onDone: (message: string) => void;
  onNavigate: (href: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const back = (
    <button
      type="button"
      onClick={onBack}
      className="text-[11.5px] text-ink-muted transition hover:text-ink-secondary"
    >
      ← Back
    </button>
  );

  // --- the assistant: nothing to paste, just somewhere to go ----------------
  if (provider === BUILT_IN_PROVIDERS.chatbot) {
    return (
      <div className="mt-3 space-y-3">
        <p className="text-[12.5px] leading-relaxed text-ink-secondary">
          It reads your own pages, so there is nothing to train. Give it a name and a greeting, tick
          “live on the site”, and the bubble appears on your site — Lumen adds it for you.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate(`/app/project/${projectId}/chatbot`)}
            className="lumen-key rounded-pill px-4 py-1.5 text-[12px]"
          >
            Set it up
          </button>
          {back}
        </div>
      </div>
    );
  }

  // --- a payment link: one field, no credentials ----------------------------
  if (provider === BUILT_IN_PROVIDERS.paymentLink) {
    const url = values.url ?? '';
    const valid = normalisePaymentUrl(url) !== null;

    return (
      <div className="mt-3 space-y-3">
        <p className="text-[12.5px] leading-relaxed text-ink-secondary">
          In Razorpay: Payment Links → create one. Stripe and PayPal have the same thing. Paste it
          here and a button goes into your site&rsquo;s menu.
        </p>
        <FlowField
          label="Payment link"
          value={url}
          onChange={(next) => setValues((current) => ({ ...current, url: next }))}
          placeholder="https://rzp.io/l/your-link"
        />
        <FlowField
          label={`Button text — blank means “${DEFAULT_PAY_LABEL}”`}
          value={values.label ?? ''}
          onChange={(next) => setValues((current) => ({ ...current, label: next }))}
          placeholder="Book with deposit"
        />
        {error ? <p className="text-[11.5px] text-[#e5735a]">{error}</p> : null}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy || !valid}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const response = await fetch(`/api/projects/${projectId}/payments`, {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ url, label: values.label ?? '' }),
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.error ?? 'That did not save');
                onDone('The button is on your site now. Reload the preview to see it in the menu.');
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'That did not save');
              } finally {
                setBusy(false);
              }
            }}
            className="lumen-key rounded-pill px-4 py-1.5 text-[12px] disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Add the button'}
          </button>
          {back}
        </div>
      </div>
    );
  }

  // --- a registry connector: whatever fields it declares ---------------------
  if (!card) {
    return (
      <div className="mt-3 space-y-3">
        <p className="text-[12.5px] text-ink-muted">That integration is not available here.</p>
        {back}
      </div>
    );
  }

  const required = card.fields.filter((field) => !field.optional);
  const ready = required.every((field) => (values[field.name] ?? '').trim().length > 0);

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[12.5px] leading-relaxed text-ink-secondary">{card.summary}</p>

      {card.oauthReady ? (
        <button
          type="button"
          onClick={() => onNavigate(`/api/connectors/${card.provider}/oauth`)}
          className="lumen-key w-full rounded-pill px-4 py-2 text-[12.5px]"
        >
          Connect with {card.name}
        </button>
      ) : null}

      {card.fields.length > 0 ? (
        <>
          {card.oauthReady ? (
            <p className="text-[11.5px] text-ink-muted">Or paste a token instead:</p>
          ) : null}
          {card.fields.map((field) => (
            <FlowField
              key={field.name}
              label={field.label}
              hint={field.help}
              secret={field.secret}
              placeholder={field.placeholder}
              value={values[field.name] ?? ''}
              onChange={(next) => setValues((current) => ({ ...current, [field.name]: next }))}
            />
          ))}
        </>
      ) : null}

      {error ? <p className="text-[11.5px] text-[#e5735a]">{error}</p> : null}

      <div className="flex items-center gap-3">
        {card.fields.length > 0 ? (
          <button
            type="button"
            disabled={busy || !ready}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const response = await fetch(`/api/connectors/${card.provider}`, {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({
                    action: 'connect',
                    projectId,
                    credentials: values,
                  }),
                });
                const payload = await response.json();
                if (!response.ok || payload.ok === false) {
                  throw new Error(payload.message ?? payload.error ?? 'That did not connect');
                }
                onDone(payload.message ?? `${card.name} is connected.`);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'That did not connect');
              } finally {
                setBusy(false);
              }
            }}
            className="lumen-key rounded-pill px-4 py-1.5 text-[12px] disabled:opacity-40"
          >
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        ) : null}
        {back}
      </div>
    </div>
  );
}

function FlowField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  secret,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  secret?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={secret ? 'password' : 'text'}
        autoComplete={secret ? 'off' : undefined}
        spellCheck={false}
        className="lumen-well w-full rounded-[10px] border border-hairline px-3 py-2 text-[13px] text-ink-primary outline-none focus:border-accent/50"
      />
      {hint ? <span className="mt-1 block text-[11px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

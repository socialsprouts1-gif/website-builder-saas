'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Field, Input } from '@/components/ui/Field';
import { DEFAULT_PAY_LABEL, normalisePaymentUrl } from '@/lib/payments';

/**
 * A pay button on the site, from a link the owner already has.
 *
 * The API-key connectors below this panel are for people wiring Lumen into
 * something. This is for the salon owner who wants a customer to be able to pay
 * a booking deposit: make a payment link in the Razorpay app, paste it, done.
 */
export function PaymentPanel({
  projectId,
  initialUrl,
  initialLabel,
}: {
  projectId: string;
  initialUrl: string | null;
  initialLabel: string | null;
}) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [label, setLabel] = useState(initialLabel ?? '');
  const [live, setLive] = useState(Boolean(initialUrl));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const valid = url.trim() === '' || normalisePaymentUrl(url) !== null;

  async function save(next: { url: string; label: string }) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/payments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'That did not save');
      setUrl(payload.url ?? '');
      setLabel(payload.label ?? '');
      setLive(Boolean(payload.url));
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[14px] text-ink-primary">Take payments on this site</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
            Paste a payment link and Lumen puts a button in your site&rsquo;s menu. The money goes
            straight to you — Lumen never holds it and never asks for your API keys.
          </p>
        </div>
        <Badge tone={live ? 'positive' : 'neutral'}>{live ? 'On the site' : 'Not set up'}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
        <Field
          label="Payment link"
          hint="Razorpay → Payment Links. Stripe → Payment Links. Or a PayPal.me or upi:// link."
        >
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://rzp.io/l/your-link"
            inputMode="url"
          />
        </Field>
        <Field label="Button text" hint={`Blank means “${DEFAULT_PAY_LABEL}”.`}>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Book with deposit"
            maxLength={40}
          />
        </Field>
      </div>

      {!valid ? (
        <p className="text-[12.5px] text-[#e5735a]">
          That is not a link a browser can open. It needs to start with https:// (or upi://).
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => save({ url, label })} disabled={busy || !valid}>
          {busy ? 'Saving…' : live ? 'Update button' : 'Add the button'}
        </Button>
        {live ? (
          <button
            type="button"
            onClick={() => save({ url: '', label: '' })}
            disabled={busy}
            className="text-[12.5px] text-ink-muted transition hover:text-[#e5735a] disabled:opacity-40"
          >
            Remove it from the site
          </button>
        ) : null}
        {saved ? <span className="text-[12.5px] text-accent">Saved.</span> : null}
      </div>

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3.5 py-2.5 text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

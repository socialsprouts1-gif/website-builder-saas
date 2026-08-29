'use client';

import { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function BillingActions({
  entitled,
  hasSubscription,
  email,
  existingGstin,
  billingConfigured,
}: {
  entitled: boolean;
  hasSubscription: boolean;
  email: string;
  existingGstin: string | null;
  billingConfigured: boolean;
}) {
  const router = useRouter();
  const [gstin, setGstin] = useState(existingGstin ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gstin: gstin.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not start checkout');

      if (window.Razorpay && payload.keyId) {
        const checkout = new window.Razorpay({
          key: payload.keyId,
          subscription_id: payload.subscriptionId,
          name: 'Lumen',
          description: '₹500 / month — everything included',
          prefill: { email },
          theme: { color: '#d7ff3e' },
          handler: () => {
            setNotice('Payment received. Your plan activates as soon as Razorpay confirms it.');
            router.refresh();
          },
          modal: { ondismiss: () => setBusy(false) },
        });
        checkout.open();
        return;
      }

      // Checkout script blocked or unavailable — fall back to Razorpay's hosted page.
      if (payload.shortUrl) {
        window.location.href = payload.shortUrl;
        return;
      }
      throw new Error('Checkout could not be opened. Try again, or disable your ad blocker.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start checkout');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/cancel', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not cancel');
      setNotice('Cancelled. Your plan stays active until the end of the period you have paid for.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not cancel');
    } finally {
      setBusy(false);
    }
  }

  if (!billingConfigured) {
    return (
      <p className="rounded-[10px] border border-hairline bg-raised px-4 py-3 text-[13px] text-ink-muted">
        Billing is not connected yet. Add your Razorpay key ID, secret, plan ID and webhook secret to the
        environment to switch payments on.
      </p>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="space-y-4">
        {!entitled || !hasSubscription ? (
          <>
            <Field
              label="GSTIN (optional)"
              hint="Add this and every invoice is issued as a GST-compliant tax invoice."
            >
              <Input
                value={gstin}
                onChange={(event) => setGstin(event.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
                maxLength={15}
              />
            </Field>
            <Button size="lg" onClick={subscribe} disabled={busy}>
              {busy ? 'Opening checkout…' : 'Subscribe — ₹500/month'}
            </Button>
          </>
        ) : (
          <Button variant="danger" onClick={cancel} disabled={busy}>
            {busy ? 'Cancelling…' : 'Cancel subscription'}
          </Button>
        )}

        {error ? (
          <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3.5 py-2.5 text-[13px] text-[#e5735a]">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-[10px] border border-accent/30 bg-accent-soft px-3.5 py-2.5 text-[13px] text-accent">
            {notice}
          </p>
        ) : null}
      </div>
    </>
  );
}

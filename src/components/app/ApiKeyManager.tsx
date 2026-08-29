'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';

export function ApiKeyManager({
  hasOwnKey,
  last4,
  freeUsed,
  freeLimit,
  platformConfigured,
}: {
  hasOwnKey: boolean;
  last4: string | null;
  freeUsed: number;
  freeLimit: number;
  platformConfigured: boolean;
}) {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not save that key');
      setKey('');
      setNotice(`Key verified — ${payload.modelCount} models available. Generations are unlimited now.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that key');
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/keys', { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not revoke that key');
      setNotice('Key removed. You are back on Lumen’s shared key and its monthly allowance.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not revoke that key');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {hasOwnKey ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-hairline bg-raised px-4 py-3">
          <div>
            <p className="font-mono text-[13px] text-ink-primary">sk-••••••••••••{last4}</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">Your key. Unlimited generations, billed by OpenAI.</p>
          </div>
          <Button variant="danger" size="sm" onClick={revoke} disabled={busy}>
            Revoke
          </Button>
        </div>
      ) : (
        <div className="rounded-[10px] border border-hairline bg-raised px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-ink-primary">Using Lumen&apos;s shared key</p>
            <Badge tone={freeUsed >= freeLimit ? 'warning' : 'accent'}>
              {Math.max(0, freeLimit - freeUsed)} / {freeLimit} left
            </Badge>
          </div>
          <p className="mt-1 text-[12px] text-ink-muted">
            {platformConfigured
              ? 'Resets on the first of each month. Add your own key below for unlimited generations.'
              : 'No platform key is configured, so you need your own key to generate.'}
          </p>
        </div>
      )}

      <Field
        label={hasOwnKey ? 'Replace your key' : 'Bring your own OpenAI key'}
        hint="Verified with one harmless models call, encrypted at rest, and never shown again."
      >
        <Input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="sk-…"
          autoComplete="off"
        />
      </Field>

      <Button onClick={save} disabled={busy || key.trim().length < 20}>
        {busy ? 'Verifying…' : hasOwnKey ? 'Replace key' : 'Save key'}
      </Button>

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
  );
}

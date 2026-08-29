'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';
import type { ConnectorCard } from '@/lib/connectors/registry';

const CATEGORY_LABELS: Record<string, string> = {
  deploy: 'Dev & deploy',
  business: 'Business tools',
  content: 'Content sources',
  commerce: 'Commerce & bookings',
};

/** A flat card grid with one obvious state per card — never nested toggles. */
export function ConnectorGrid({
  cards,
  projectId,
}: {
  cards: ConnectorCard[];
  projectId?: string;
}) {
  const [openProvider, setOpenProvider] = useState<string | null>(null);

  const categories = [...new Set(cards.map((card) => card.category))];

  return (
    <div className="space-y-10">
      {categories.map((category) => (
        <section key={category}>
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {cards
              .filter((card) => card.category === category)
              .map((card) => (
                <ConnectorTile
                  key={card.provider}
                  card={card}
                  projectId={projectId}
                  open={openProvider === card.provider}
                  onToggle={() =>
                    setOpenProvider((current) => (current === card.provider ? null : card.provider))
                  }
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ConnectorTile({
  card,
  projectId,
  open,
  onToggle,
}: {
  card: ConnectorCard;
  projectId?: string;
  open: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function post(action: 'connect' | 'disconnect' | 'sync') {
    setBusy(true);
    setMessage(null);
    setFailed(false);
    try {
      const response = await fetch(`/api/connectors/${card.provider}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, projectId, credentials: action === 'connect' ? values : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setFailed(true);
        setMessage(payload.message ?? payload.error ?? 'That did not work');
        return;
      }
      setMessage(payload.message ?? (action === 'disconnect' ? 'Disconnected.' : 'Done.'));
      setValues({});
      router.refresh();
    } catch {
      setFailed(true);
      setMessage('Could not reach Lumen. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const connected = card.status.connected;

  return (
    <div
      className={cn(
        'rounded-card border bg-raised p-4 transition',
        connected ? 'border-accent/30' : 'border-hairline',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-primary">{card.name}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{card.summary}</p>
        </div>
        <Badge tone={connected ? 'accent' : 'neutral'} className="shrink-0 px-2.5 py-1 text-[10px]">
          {connected ? 'Connected' : 'Not connected'}
        </Badge>
      </div>

      {!card.configured && card.authKind === 'oauth' ? (
        <p className="mt-3 text-[12px] text-ink-muted">
          Add this provider&apos;s client ID and secret to the environment to enable it.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {connected ? (
            <>
              {card.canSync ? (
                <Button size="sm" variant="secondary" onClick={() => post('sync')} disabled={busy}>
                  Test
                </Button>
              ) : null}
              <Button size="sm" variant="danger" onClick={() => post('disconnect')} disabled={busy}>
                Disconnect
              </Button>
            </>
          ) : card.authKind === 'oauth' ? (
            <Button size="sm" onClick={() => router.push(`/api/connectors/${card.provider}/oauth`)}>
              Connect
            </Button>
          ) : (
            <Button size="sm" variant={open ? 'secondary' : 'primary'} onClick={onToggle}>
              {open ? 'Cancel' : 'Connect'}
            </Button>
          )}
        </div>
      )}

      {open && !connected && card.authKind === 'api_key' ? (
        <div className="mt-4 space-y-3 border-t border-hairline pt-4">
          {card.fields.map((field) => (
            <Field key={field.name} label={field.label} hint={field.help}>
              <Input
                type={field.secret ? 'password' : 'text'}
                placeholder={field.placeholder}
                value={values[field.name] ?? ''}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
                autoComplete="off"
              />
            </Field>
          ))}
          <Button size="sm" onClick={() => post('connect')} disabled={busy}>
            {busy ? 'Checking…' : 'Save and verify'}
          </Button>
        </div>
      ) : null}

      {message ? (
        <p className={cn('mt-3 text-[12.5px]', failed ? 'text-[#e5735a]' : 'text-accent')}>{message}</p>
      ) : null}
    </div>
  );
}

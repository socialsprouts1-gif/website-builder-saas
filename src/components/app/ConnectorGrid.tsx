'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';
import { ConnectorMark } from '@/components/app/ConnectorMark';
import type { ConnectorCard } from '@/lib/connectors/registry';

const CATEGORY_LABELS: Record<string, string> = {
  deploy: 'Dev & deploy',
  business: 'Business tools',
  content: 'Content sources',
  commerce: 'Commerce & bookings',
};

type Filter = { kind: 'all' } | { kind: 'enabled' } | { kind: 'category'; value: string };

/**
 * Browse-and-connect layout: search, a filter rail with live counts, and a
 * two-column grid. One screen, one job — connecting a tool — with the detail
 * form opening in place rather than on another page.
 */
export function ConnectorGrid({ cards, projectId }: { cards: ConnectorCard[]; projectId?: string }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const [openProvider, setOpenProvider] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) counts.set(card.category, (counts.get(card.category) ?? 0) + 1);
    return [...counts.entries()];
  }, [cards]);

  const enabledCount = cards.filter((card) => card.status.connected).length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards
      .filter((card) => {
        if (filter.kind === 'enabled' && !card.status.connected) return false;
        if (filter.kind === 'category' && card.category !== filter.value) return false;
        if (!needle) return true;
        return (
          card.name.toLowerCase().includes(needle) || card.summary.toLowerCase().includes(needle)
        );
      })
      // Connected first, then alphabetical, so the ones in use stay findable.
      .sort((a, b) => {
        if (a.status.connected !== b.status.connected) return a.status.connected ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [cards, filter, query]);

  return (
    <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          aria-label="Search connectors"
        />

        <div className="space-y-0.5">
          <RailRow
            label="Enabled"
            count={enabledCount}
            active={filter.kind === 'enabled'}
            onClick={() => setFilter({ kind: 'enabled' })}
          />
          <RailRow
            label="All"
            count={cards.length}
            active={filter.kind === 'all'}
            onClick={() => setFilter({ kind: 'all' })}
          />
        </div>

        <div className="space-y-0.5">
          <p className="px-3 pb-1.5 text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
            Categories
          </p>
          {categories.map(([category, count]) => (
            <RailRow
              key={category}
              label={CATEGORY_LABELS[category] ?? category}
              count={count}
              active={filter.kind === 'category' && filter.value === category}
              onClick={() => setFilter({ kind: 'category', value: category })}
            />
          ))}
        </div>

        <RequestConnector />
      </aside>

      <div>
        {visible.length === 0 ? (
          <p className="rounded-card border border-dashed border-hairline px-4 py-12 text-center text-[13px] text-ink-muted">
            {query.trim() ? `Nothing matches “${query.trim()}”.` : 'Nothing here yet.'}
          </p>
        ) : (
          <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
            {visible.map((card) => (
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
        )}
      </div>
    </div>
  );
}

function RailRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-[9px] px-3 py-2 text-left text-[13px] transition',
        active ? 'bg-accent-soft text-accent' : 'text-ink-secondary hover:bg-white/5 hover:text-ink-primary',
      )}
    >
      <span className="truncate">{label}</span>
      <span className={cn('shrink-0 text-[12px]', active ? 'text-accent' : 'text-ink-muted')}>{count}</span>
    </button>
  );
}

function RequestConnector() {
  const [sent, setSent] = useState(false);

  return (
    <div className="rounded-card border border-hairline bg-raised p-4">
      <p className="text-[13px] text-ink-primary">Missing a connector?</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
        Adding one is a registry entry, not a rebuild — tell us which and it can ship quickly.
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="mt-3 w-full"
        onClick={() => {
          window.location.href =
            'mailto:socialsprouts1@gmail.com?subject=Lumen%20connector%20request&body=Which%20tool%20would%20you%20like%20to%20connect%3F';
          setSent(true);
        }}
      >
        {sent ? 'Opening mail…' : 'Request'}
      </Button>
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
        'flex h-full flex-col rounded-card border bg-raised p-4 transition',
        connected ? 'border-accent/25' : 'border-hairline hover:border-white/15',
      )}
    >
      <div className="flex items-start gap-3">
        <ConnectorMark provider={card.provider} name={card.name} connected={connected} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] text-ink-primary">{card.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-ink-muted">{card.summary}</p>
        </div>
      </div>

      {!card.configured && card.authKind === 'oauth' ? (
        <p className="mt-auto pt-3 text-[11.5px] text-ink-muted">
          Not configured on this deployment — add its client ID and secret.
        </p>
      ) : (
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
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
        <p className={cn('mt-3 text-[12px]', failed ? 'text-[#e5735a]' : 'text-accent')}>{message}</p>
      ) : null}
    </div>
  );
}

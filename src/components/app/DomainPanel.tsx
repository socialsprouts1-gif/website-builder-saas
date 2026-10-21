'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { DomainPurchase } from '@/components/app/DomainPurchase';

interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  purpose: string;
}

interface DomainStatus {
  domain: string;
  /** Every name attached: an apex and its www, or a single subdomain. */
  hostnames?: string[];
  /** Vercel is serving it, which means the records have landed. */
  live: boolean;
  records: DnsRecord[];
  /** What is still outstanding, in words the owner can act on. */
  note?: string;
}

/**
 * Three steps, in the order a person actually does them: name the domain, copy
 * the records into the registrar, press check.
 *
 * It used to need a fourth thing first — a Vercel account connected and the
 * site deployed to it — which is where everybody stopped. Lumen holds the
 * domain on its own deployment now, so what is needed is a published site and
 * the login for wherever the domain was bought.
 */
export function DomainPanel({
  projectId,
  published,
  initialDomain,
}: {
  projectId: string;
  /** A domain needs something to answer with, and that is the published site. */
  published: boolean;
  initialDomain: string | null;
}) {
  const [domain, setDomain] = useState(initialDomain ?? '');
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [busy, setBusy] = useState<'add' | 'verify' | 'remove' | 'load' | null>(
    initialDomain ? 'load' : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<'own' | 'buy'>('own');

  const send = useCallback(
    async (action: 'add' | 'verify' | 'remove', value: string) => {
      setBusy(action);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/domain`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ domain: value, action }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'That did not work');
        setStatus(payload.domain ? payload : null);
        if (action === 'remove') setDomain('');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'That did not work');
      } finally {
        setBusy(null);
      }
    },
    [projectId],
  );

  // Load the live state for a domain attached on a previous visit.
  useEffect(() => {
    if (!initialDomain) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/domain`);
        const payload = await response.json();
        if (!cancelled && response.ok && payload.domain) setStatus(payload);
      } catch {
        // Leave the form in its entry state; the user can press Connect again.
      } finally {
        if (!cancelled) setBusy(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialDomain, projectId]);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError('Could not copy — select the value and copy it manually.');
    }
  }

  if (!published) {
    return (
      <Card>
        <p className="text-[15px] leading-relaxed text-ink-secondary">
          Publish the site first — press Publish above. A domain needs something to point at, and that is
          the published site. It takes a second and you can change it as often as you like afterwards.
        </p>
      </Card>
    );
  }

  // Once a domain is attached the tabs are noise: there is one domain and one
  // set of steps left to finish.
  if (!status) {
    return (
      <Card className="space-y-5">
        <div className="flex gap-1 rounded-pill border border-hairline p-1">
          {([
            ['own', 'I already own one'],
            ['buy', 'Buy a new one'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'flex-1 rounded-pill px-3 py-1.5 text-[14.5px] transition',
                tab === value ? 'bg-accent text-accent-ink' : 'text-ink-secondary hover:text-ink-primary',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'buy' ? (
          <DomainPurchase
            projectId={projectId}
            onBought={(bought) => {
              setDomain(bought);
              setTab('own');
              void send('verify', bought);
            }}
          />
        ) : (
          <ConnectForm
            domain={domain}
            onChange={setDomain}
            onConnect={() => send('add', domain)}
            busy={busy !== null}
            connecting={busy === 'add'}
          />
        )}

        {error ? (
          <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[15px] text-[#e5735a]">
            {error}
          </p>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <Step
        number={1}
        title="Name your domain"
        done
        body={
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[15.5px] text-ink-primary">{status.domain}</span>
            <Button
              size="sm"
              variant="danger"
              onClick={() => send('remove', status.domain)}
              disabled={busy !== null}
            >
              {busy === 'remove' ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        }
      />

      <Step
            number={2}
            title="Add these records at your registrar"
            done={status.live}
            body={
              <div className="space-y-2">
                <p className="text-[14.5px] leading-relaxed text-ink-muted">
                  Wherever you bought the domain — GoDaddy, Namecheap, BigRock, Hostinger — open its DNS
                  settings and add each row below. If a row of the same type and name is already there,
                  delete it first: two answers for the same name is the usual reason a domain half works.
                </p>
                {status.records.map((record) => (
                  <div key={`${record.type}-${record.name}-${record.value}`} className="rounded-[10px] border border-hairline bg-[var(--bg-base-deep)] p-3">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[14px]">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-ink-primary">{record.type}</span>
                      <span className="text-ink-secondary">{record.name}</span>
                      <span className="text-ink-muted">→</span>
                      <span className="min-w-0 flex-1 truncate text-ink-primary">{record.value}</span>
                      <button
                        type="button"
                        onClick={() => copy(record.value)}
                        className="shrink-0 text-[13px] text-accent transition hover:underline"
                      >
                        {copied === record.value ? 'copied' : 'copy'}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[13.5px] text-ink-muted">{record.purpose}</p>
                  </div>
                ))}
              </div>
            }
          />

          <Step
            number={3}
            title="Check it"
            done={status.live}
            last
            body={
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => send('verify', status.domain)} disabled={busy !== null}>
                    {busy === 'verify' ? 'Checking…' : 'Check now'}
                  </Button>
                  <Badge tone={status.live ? 'accent' : 'warning'}>
                    {status.live ? 'Live' : 'Waiting for DNS'}
                  </Badge>
                  {status.live ? (
                    <a
                      href={`https://${status.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[15px] text-accent hover:underline"
                    >
                      Open {status.domain} ↗
                    </a>
                  ) : null}
                </div>
                {status.note ? (
                  <p className="text-[14px] leading-relaxed text-ink-muted">{status.note}</p>
                ) : null}
                {!status.live ? (
                  <p className="text-[14px] leading-relaxed text-ink-muted">
                    Nothing is broken while this says waiting — DNS takes a few minutes and occasionally a
                    few hours. Press Check now again in a bit. Your site stays reachable on its Lumen link
                    the whole time.
                  </p>
                ) : null}
              </div>
            }
          />

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[15px] text-[#e5735a]">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function Step({
  number,
  title,
  body,
  done,
  last,
}: {
  number: number;
  title: string;
  body: React.ReactNode;
  done?: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border text-[13px]',
            done ? 'border-accent bg-accent text-accent-ink' : 'border-hairline text-ink-muted',
          )}
        >
          {done ? '✓' : number}
        </span>
        {!last ? <span className="mt-1 w-px flex-1 bg-hairline" aria-hidden /> : null}
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <p className="mb-2 text-[15.5px] text-ink-primary">{title}</p>
        {body}
      </div>
    </div>
  );
}

function ConnectForm({
  domain,
  onChange,
  onConnect,
  busy,
  connecting,
}: {
  domain: string;
  onChange: (value: string) => void;
  onConnect: () => void;
  busy: boolean;
  connecting: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="" className="min-w-[220px] flex-1">
          <Input
            value={domain}
            onChange={(event) => onChange(event.target.value.trim().toLowerCase())}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && domain.length >= 4) onConnect();
            }}
            placeholder="yourbusiness.in"
            aria-label="Domain you already own"
          />
        </Field>
        <Button onClick={onConnect} disabled={busy || domain.length < 4}>
          {connecting ? 'Connecting…' : 'Connect'}
        </Button>
      </div>
      <p className="text-[14px] text-ink-muted">
        Enter it as you bought it — yourbusiness.in, not www or https. Lumen connects the www for you and
        shows the rows to paste at your registrar.
      </p>
    </div>
  );
}

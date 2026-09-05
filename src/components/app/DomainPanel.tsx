'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';

interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  purpose: string;
}

interface DomainStatus {
  domain: string;
  verified: boolean;
  records: DnsRecord[];
}

/**
 * Three steps, in the order a person actually does them: name the domain, copy
 * the records into the registrar, press check. The DNS values come back from
 * Vercel rather than being guessed here, so what is shown is what Vercel will
 * actually look for.
 */
export function DomainPanel({
  projectId,
  deployed,
  initialDomain,
}: {
  projectId: string;
  deployed: boolean;
  initialDomain: string | null;
}) {
  const [domain, setDomain] = useState(initialDomain ?? '');
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [busy, setBusy] = useState<'add' | 'verify' | 'remove' | 'load' | null>(
    initialDomain ? 'load' : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

  if (!deployed) {
    return (
      <Card>
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          Deploy to Vercel first. A domain needs somewhere to point, and the deploy is what creates it.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <Step
        number={1}
        title="Name your domain"
        done={Boolean(status)}
        body={
          <div className="flex flex-wrap items-end gap-2">
            <Field label="" className="flex-1 min-w-[220px]">
              <Input
                value={domain}
                onChange={(event) => setDomain(event.target.value.trim().toLowerCase())}
                placeholder="yourbusiness.in"
                disabled={Boolean(status)}
              />
            </Field>
            {status ? (
              <Button
                variant="danger"
                onClick={() => send('remove', status.domain)}
                disabled={busy !== null}
              >
                {busy === 'remove' ? 'Removing…' : 'Remove'}
              </Button>
            ) : (
              <Button onClick={() => send('add', domain)} disabled={busy !== null || domain.length < 4}>
                {busy === 'add' ? 'Connecting…' : 'Connect'}
              </Button>
            )}
          </div>
        }
      />

      {status ? (
        <>
          <Step
            number={2}
            title="Add these records at your registrar"
            done={status.verified}
            body={
              <div className="space-y-2">
                <p className="text-[12.5px] leading-relaxed text-ink-muted">
                  Wherever you bought the domain — GoDaddy, Namecheap, BigRock — find its DNS settings and
                  add each row below. Delete any existing record with the same type and name.
                </p>
                {status.records.map((record) => (
                  <div key={`${record.type}-${record.name}-${record.value}`} className="rounded-[10px] border border-hairline bg-[var(--bg-base-deep)] p-3">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[12px]">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-ink-primary">{record.type}</span>
                      <span className="text-ink-secondary">{record.name}</span>
                      <span className="text-ink-muted">→</span>
                      <span className="min-w-0 flex-1 truncate text-ink-primary">{record.value}</span>
                      <button
                        type="button"
                        onClick={() => copy(record.value)}
                        className="shrink-0 text-[11px] text-accent transition hover:underline"
                      >
                        {copied === record.value ? 'copied' : 'copy'}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-ink-muted">{record.purpose}</p>
                  </div>
                ))}
              </div>
            }
          />

          <Step
            number={3}
            title="Check it"
            done={status.verified}
            last
            body={
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => send('verify', status.domain)} disabled={busy !== null}>
                    {busy === 'verify' ? 'Checking…' : 'Check now'}
                  </Button>
                  <Badge tone={status.verified ? 'accent' : 'warning'}>
                    {status.verified ? 'Live' : 'Waiting for DNS'}
                  </Badge>
                  {status.verified ? (
                    <a
                      href={`https://${status.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] text-accent hover:underline"
                    >
                      Open {status.domain} ↗
                    </a>
                  ) : null}
                </div>
                {!status.verified ? (
                  <p className="text-[12px] leading-relaxed text-ink-muted">
                    DNS usually takes a few minutes and can take up to an hour. Nothing is broken while this
                    says waiting — press Check now again in a bit. Your site stays live on its Vercel URL
                    throughout.
                  </p>
                ) : null}
              </div>
            }
          />
        </>
      ) : null}

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[13px] text-[#e5735a]">
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
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border text-[11px]',
            done ? 'border-accent bg-accent text-accent-ink' : 'border-hairline text-ink-muted',
          )}
        >
          {done ? '✓' : number}
        </span>
        {!last ? <span className="mt-1 w-px flex-1 bg-hairline" aria-hidden /> : null}
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <p className="mb-2 text-[13.5px] text-ink-primary">{title}</p>
        {body}
      </div>
    </div>
  );
}

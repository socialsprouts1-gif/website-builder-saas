'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';

export interface SiteSummary {
  id: string;
  name: string;
  description: string | null;
  businessType: string | null;
  status: string;
}

const TONE = {
  ready: 'positive',
  generating: 'accent',
  failed: 'warning',
  draft: 'neutral',
} as const;

const LABEL: Record<string, string> = {
  ready: 'ready',
  generating: 'building',
  failed: 'stopped',
  draft: 'draft',
};

/**
 * A site in the list. A build that never finished is the interesting case: it
 * gets a plain explanation and two ways out, because the alternative — which is
 * what shipped — is a card that says Building forever with nothing to click.
 */
export function SiteCard({ site }: { site: SiteSummary }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'retry' | 'delete' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy('retry');
    setError(null);
    try {
      const response = await fetch(`/api/projects/${site.id}/retry`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not start it again');
      router.push(`/app/project/${site.id}?job=${payload.jobId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start it again');
      setBusy(null);
    }
  }

  async function remove() {
    setBusy('delete');
    setError(null);
    try {
      const response = await fetch(`/api/projects/${site.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Could not delete it');
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete it');
      setBusy(null);
      setConfirming(false);
    }
  }

  const ready = site.status === 'ready';
  const stopped = site.status === 'failed';

  return (
    <div
      className={cn(
        'flex flex-col rounded-card border bg-raised transition',
        stopped ? 'border-[#e5735a]/25' : 'border-hairline hover:border-accent/30',
      )}
    >
      <Link
        href={`/app/project/${site.id}`}
        className="group block"
        tabIndex={ready ? 0 : -1}
        aria-hidden={!ready}
      >
        <div className="aspect-[16/10] overflow-hidden rounded-t-card border-b border-hairline bg-[var(--bg-base-deep)]">
          {ready ? (
            <iframe
              src={`/preview/${site.id}/index.html`}
              title={site.name}
              loading="lazy"
              sandbox="allow-scripts"
              tabIndex={-1}
              className="pointer-events-none h-[500px] w-[800px] origin-top-left scale-[0.42] border-0 bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-[12px] text-ink-muted">
              {site.status === 'generating' ? 'Building…' : stopped ? 'Never finished' : 'No preview yet'}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="truncate text-sm text-ink-primary">
            {ready ? (
              <Link href={`/app/project/${site.id}`} className="hover:underline">
                {site.name}
              </Link>
            ) : (
              site.name
            )}
          </h2>
          <Badge
            tone={TONE[site.status as keyof typeof TONE] ?? 'neutral'}
            className="shrink-0 px-2 py-1 text-[10px]"
          >
            {LABEL[site.status] ?? site.status}
          </Badge>
        </div>

        <p className="line-clamp-2 text-[12.5px] text-ink-muted">
          {stopped
            ? 'The build stopped before it finished. Nothing was charged twice — start it again.'
            : (site.description ?? site.businessType ?? 'Generated with Lumen')}
        </p>

        {error ? <p className="text-[11.5px] text-[#e5735a]">{error}</p> : null}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2 text-[12px]">
          {stopped ? (
            <button
              type="button"
              onClick={retry}
              disabled={busy !== null}
              className="text-accent transition hover:underline disabled:opacity-40"
            >
              {busy === 'retry' ? 'Starting…' : 'Build it again'}
            </button>
          ) : null}
          {site.status === 'generating' ? (
            <Link href={`/app/project/${site.id}`} className="text-accent hover:underline">
              Open and watch
            </Link>
          ) : null}

          {confirming ? (
            <span className="ml-auto flex items-center gap-2">
              <span className="text-ink-muted">Delete for good?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-ink-secondary transition hover:text-ink-primary"
              >
                No
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={busy !== null}
                className="text-[#e5735a] transition hover:underline disabled:opacity-40"
              >
                {busy === 'delete' ? 'Deleting…' : 'Yes, delete'}
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="ml-auto text-ink-muted transition hover:text-[#e5735a]"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

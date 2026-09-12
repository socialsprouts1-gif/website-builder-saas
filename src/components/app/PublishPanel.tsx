'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { normaliseSlug, publicUrl } from '@/lib/publish';

/**
 * Putting the site on the internet, before anyone buys a domain.
 *
 * Most people want to send the site to someone the minute it exists — a
 * partner, a customer, themselves on a phone. Making that wait on a domain
 * purchase is the wrong order, so this comes first and the domain attaches to
 * it afterwards.
 */
export function PublishPanel({
  projectId,
  siteUrl,
  initialSlug,
  initialPublished,
  initialFavicon,
  ready,
}: {
  projectId: string;
  siteUrl: string;
  initialSlug: string | null;
  initialPublished: boolean;
  initialFavicon: string | null;
  ready: boolean;
}) {
  const [slug, setSlug] = useState(initialSlug ?? '');
  const [published, setPublished] = useState(initialPublished);
  const [favicon, setFavicon] = useState(initialFavicon);
  const [busy, setBusy] = useState<'publish' | 'unpublish' | 'favicon' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normalised as you type, so the address on screen is the address you get
  // rather than whatever was typed with its spaces and capitals.
  const address = normaliseSlug(slug);
  const url = address ? publicUrl(siteUrl, address) : '';

  async function send(action: 'publish' | 'unpublish') {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, slug: slug || undefined }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'That did not work');
      setPublished(Boolean(payload.published));
      if (payload.slug) setSlug(payload.slug);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work');
    } finally {
      setBusy(null);
    }
  }

  async function uploadFavicon(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('That is not an image. PNG, SVG or ICO please.');
      return;
    }
    if (file.size > 512 * 1024) {
      setError('That icon is over 512KB. A favicon should be tiny.');
      return;
    }

    setBusy('favicon');
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'favicon');
      const response = await fetch(`/api/projects/${projectId}/assets`, { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'That upload failed');
      setFavicon(payload.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That upload failed');
    } finally {
      setBusy(null);
    }
  }

  if (!ready) {
    return (
      <Card>
        <p className="text-[13px] text-ink-secondary">
          Once the site has finished building it gets a public address you can share straight away.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-ink-primary">Public address</p>
        <Badge tone={published ? 'positive' : 'neutral'}>{published ? 'Live' : 'Not published'}</Badge>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            {siteUrl.replace(/^https?:\/\//, '')}/s/
          </span>
          <Input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="hairtie-bandra"
            aria-label="Public address"
          />
          {address && address !== slug ? (
            <span className="mt-1 block text-[11.5px] text-ink-muted">Will be published as {address}</span>
          ) : null}
        </label>
        <Button onClick={() => send('publish')} disabled={busy !== null || !address}>
          {busy === 'publish' ? 'Publishing…' : published ? 'Update address' : 'Publish'}
        </Button>
      </div>

      {published && url ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-accent/30 bg-accent-soft px-4 py-3">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-[13px] text-accent underline"
          >
            {url}
          </a>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              });
            }}
            className="shrink-0 text-[12px] text-accent hover:underline"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={() => send('unpublish')}
            disabled={busy !== null}
            className="shrink-0 text-[12px] text-ink-muted transition hover:text-[#e5735a] disabled:opacity-40"
          >
            {busy === 'unpublish' ? 'Taking down…' : 'Take offline'}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-hairline bg-[var(--bg-base-deep)]">
          {favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="" className="h-6 w-6 object-contain" />
          ) : (
            <span className="text-[10px] text-ink-muted">ico</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-ink-primary">Browser tab icon</p>
          <p className="text-[11.5px] text-ink-muted">A square PNG or SVG, 512KB or less.</p>
        </div>
        <label className="shrink-0">
          <span className="cursor-pointer rounded-pill border border-hairline px-3.5 py-2 text-[13px] text-ink-secondary transition hover:text-ink-primary">
            {busy === 'favicon' ? 'Uploading…' : favicon ? 'Replace' : 'Upload'}
          </span>
          <input
            type="file"
            accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadFavicon(file);
            }}
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

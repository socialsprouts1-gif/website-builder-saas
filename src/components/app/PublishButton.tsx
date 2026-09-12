'use client';

import { useEffect, useRef, useState } from 'react';
import { normaliseSlug, publicUrl } from '@/lib/publish';
import { cn } from '@/components/ui/cn';

const PANEL_WIDTH = 310;

/**
 * Publishing, from the screen where the site actually is.
 *
 * It used to live only on the Deploy tab, two clicks away behind a word that
 * means "set up hosting". The moment a site finishes is the moment someone
 * wants to send it to a person, so the button belongs here, next to the site.
 */
export function PublishButton({
  projectId,
  suggestedName,
  initialSlug,
  initialPublished,
  onPublished,
  openSignal = 0,
}: {
  projectId: string;
  suggestedName: string;
  initialSlug: string | null;
  initialPublished: boolean;
  onPublished?: (url: string) => void;
  /** Bump to open the panel from elsewhere, such as the finished-site prompt. */
  openSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(initialSlug ?? normaliseSlug(suggestedName));
  const [published, setPublished] = useState(initialPublished);
  const [busy, setBusy] = useState<'publish' | 'unpublish' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // The preview window clips its own overflow, so the panel is placed against
  // the viewport rather than hung off the button inside it.
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  // The address is whatever domain this is being used on, not a build-time
  // constant: the same app answers on a preview URL and on its own domain, and
  // a link that points at the wrong one is worse than no link.
  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    if (!open) return;

    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({
        top: rect.bottom + 8,
        left: Math.max(12, Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 12)),
      });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    const onClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const address = normaliseSlug(slug);
  const url = origin && address ? publicUrl(origin, address) : '';

  async function send(action: 'publish' | 'unpublish') {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, slug: address || undefined }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'That did not work');
      setPublished(Boolean(payload.published));
      if (payload.slug) {
        setSlug(payload.slug);
        if (payload.published && origin) onPublished?.(publicUrl(origin, payload.slug));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work');
    } finally {
      setBusy(null);
    }
  }

  function copy() {
    if (!url) return;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'rounded-pill px-3 py-1 text-[11px] uppercase tracking-[0.12em] transition',
          published
            ? 'border border-accent/40 bg-accent-soft text-accent'
            : 'bg-accent text-[#12140b] hover:brightness-110',
        )}
      >
        {published ? 'Live ↗' : 'Publish'}
      </button>

      {open && anchor ? (
        <div
          className="fixed z-50 rounded-[12px] border border-hairline bg-raised p-4 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
          style={{ top: anchor.top, left: anchor.left, width: PANEL_WIDTH }}
        >
          <p className="text-[13px] text-ink-primary">
            {published ? 'Your site is live' : 'Put this site on the internet'}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
            {published
              ? 'Anyone with this link can open it. No domain needed.'
              : 'You get a link you can send straight away. A custom domain can come later.'}
          </p>

          <label className="mt-3 block">
            <span className="mb-1 block text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
              {origin ? origin.replace(/^https?:\/\//, '') : ''}/s/
            </span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="hairtie-bandra"
              aria-label="Public address"
              className="w-full rounded-[8px] border border-hairline bg-[var(--bg-base-deep)] px-3 py-2 text-[13px] text-ink-primary outline-none focus:border-accent/50"
            />
          </label>
          {address && address !== slug ? (
            <p className="mt-1 text-[11px] text-ink-muted">Published as {address}</p>
          ) : null}

          <button
            type="button"
            onClick={() => send('publish')}
            disabled={busy !== null || !address}
            className="mt-3 w-full rounded-pill bg-accent px-4 py-2 text-[12.5px] text-[#12140b] transition hover:brightness-110 disabled:opacity-40"
          >
            {busy === 'publish' ? 'Publishing…' : published ? 'Update address' : 'Publish site'}
          </button>

          {published && url ? (
            <div className="mt-3 space-y-2 border-t border-hairline pt-3">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-[12px] text-accent underline"
              >
                {url}
              </a>
              <div className="flex items-center gap-3">
                <button type="button" onClick={copy} className="text-[11.5px] text-accent hover:underline">
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <button
                  type="button"
                  onClick={() => send('unpublish')}
                  disabled={busy !== null}
                  className="text-[11.5px] text-ink-muted transition hover:text-[#e5735a] disabled:opacity-40"
                >
                  {busy === 'unpublish' ? 'Taking down…' : 'Take offline'}
                </button>
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-[11.5px] text-[#e5735a]">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

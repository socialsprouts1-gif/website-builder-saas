'use client';

import { useEffect, useRef, useState } from 'react';
import { normaliseSlug, publicUrl } from '@/lib/publish';
import { cn } from '@/components/ui/cn';

const PANEL_WIDTH = 340;

/**
 * Publishing, from the screen where the site actually is.
 *
 * It used to live only on the Deploy tab, two clicks away behind a word that
 * means "set up hosting". The moment a site finishes is the moment someone
 * wants to send it to a person, so the button belongs here, next to the site.
 *
 * The panel is a two-beat flow rather than a form: set the address and,
 * optionally, the tab icon — then publish, and the link is what you are left
 * looking at.
 */
export function PublishButton({
  projectId,
  suggestedName,
  initialSlug,
  initialPublished,
  initialFavicon = null,
  onPublished,
  openSignal = 0,
}: {
  projectId: string;
  suggestedName: string;
  initialSlug: string | null;
  initialPublished: boolean;
  initialFavicon?: string | null;
  onPublished?: (url: string) => void;
  /** Bump to open the panel from elsewhere, such as the finished-site prompt. */
  openSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(initialSlug ?? normaliseSlug(suggestedName));
  const [published, setPublished] = useState(initialPublished);
  const [favicon, setFavicon] = useState(initialFavicon);
  const [busy, setBusy] = useState<'publish' | 'unpublish' | 'favicon' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  // After publishing, the link is the point. "Change the address" goes back.
  const [editing, setEditing] = useState(false);

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
        top: rect.bottom + 10,
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
  const showLink = published && !editing;

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
      setEditing(false);
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
      const response = await fetch(`/api/projects/${projectId}/assets`, {
        method: 'POST',
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'That upload failed');
      setFavicon(payload.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That upload failed');
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
            : 'lumen-key',
        )}
      >
        {published ? 'Live ↗' : 'Publish'}
      </button>

      {open && anchor ? (
        <div
          className="lumen-panel fixed z-50 overflow-hidden rounded-[16px] border border-hairline"
          style={{ top: anchor.top, left: anchor.left, width: PANEL_WIDTH }}
        >
          {/* ---- header: what this panel is, as an object ---- */}
          <div className="flex items-start gap-3 border-b border-hairline px-4 py-3.5">
            <span className="lumen-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]">
              <GlobeMark />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] leading-tight text-ink-primary">
                {showLink ? 'Your site is live' : 'Put this site on the internet'}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                {showLink
                  ? 'Anyone with this link can open it. No domain needed.'
                  : 'You get a link you can send straight away.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-1 -mt-1 shrink-0 rounded-pill px-1.5 text-[16px] leading-none text-ink-muted transition hover:text-ink-primary"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 px-4 py-4">
            {showLink ? (
              <>
                <div className="lumen-well rounded-[12px] border border-accent/25 px-3.5 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">Your link</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 block truncate text-[12.5px] text-accent underline decoration-accent/40 underline-offset-2"
                  >
                    {url.replace(/^https?:\/\//, '')}
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={copy} className="lumen-key rounded-pill px-4 py-2 text-[12.5px]">
                    {copied ? 'Copied ✓' : 'Copy link'}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="lumen-raise rounded-pill border border-hairline px-4 py-2 text-center text-[12.5px] text-ink-secondary"
                  >
                    Open ↗
                  </a>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-[11.5px] text-ink-muted transition hover:text-ink-primary"
                  >
                    Change address or icon
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
              </>
            ) : (
              <>
                <label className="block">
                  {/* The host goes above the field, not inside it. A preview
                      deployment's hostname is sixty characters long and eats
                      the box it is supposed to be labelling. */}
                  <span className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                      Address
                    </span>
                    <span
                      className="min-w-0 truncate text-[10.5px] text-ink-muted"
                      dir="rtl"
                      title={url || undefined}
                    >
                      {origin ? `${origin.replace(/^https?:\/\//, '')}/s/` : '/s/'}
                    </span>
                  </span>
                  <span className="lumen-well flex items-center rounded-[10px] border border-hairline focus-within:border-accent/50">
                    <input
                      value={slug}
                      onChange={(event) => setSlug(event.target.value)}
                      placeholder="hairtie-bandra"
                      aria-label="Public address"
                      className="w-full min-w-0 flex-1 bg-transparent px-3 py-2 text-[13px] text-ink-primary outline-none"
                    />
                  </span>
                  {address && address !== slug ? (
                    <span className="mt-1.5 block text-[11px] text-ink-muted">
                      Published as {address}
                    </span>
                  ) : null}
                </label>

                {/* Optional, and said so: nobody should feel blocked on finding
                    a logo before their site can go online. */}
                <div className="lumen-raise flex items-center gap-3 rounded-[12px] border border-hairline p-3">
                  <span className="lumen-well flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-hairline">
                    {favicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={favicon} alt="" className="h-6 w-6 object-contain" />
                    ) : (
                      <span className="text-[9px] uppercase tracking-[0.1em] text-ink-muted">ico</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] text-ink-primary">
                      Tab icon <span className="text-ink-muted">— optional</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
                      A square PNG or SVG, under 512KB.
                    </span>
                  </span>
                  <label className="shrink-0">
                    <span className="lumen-raise cursor-pointer rounded-pill border border-hairline px-3 py-1.5 text-[11.5px] text-ink-secondary">
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

                <button
                  type="button"
                  onClick={() => send('publish')}
                  disabled={busy !== null || !address}
                  className="lumen-key w-full rounded-pill px-4 py-2.5 text-[13px] disabled:opacity-40"
                >
                  {busy === 'publish'
                    ? 'Publishing…'
                    : published
                      ? 'Update and republish'
                      : 'Publish site'}
                </button>

                {published ? (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="w-full text-[11.5px] text-ink-muted transition hover:text-ink-secondary"
                  >
                    Back to the link
                  </button>
                ) : null}
              </>
            )}

            {error ? (
              <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3 py-2 text-[11.5px] leading-relaxed text-[#e5735a]">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** A small dimensional mark, so the header is an object rather than a label. */
function GlobeMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M3 10h14M10 3c2.2 2.4 2.2 11.6 0 14M10 3C7.8 5.4 7.8 14.6 10 17"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

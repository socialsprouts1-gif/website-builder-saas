'use client';

import type { BuildSuggestion } from '@/lib/generation/suggest';
import { cn } from '@/components/ui/cn';

/**
 * "Here is what your site could have next", in the chat, where the work happens.
 *
 * Not a dialog. A dialog is something to dismiss before you can get on with it,
 * and this is the getting on with it: the first build is a home page and the
 * bones of a site, and everything else is one press away. Each item is read off
 * the site as it currently stands, so nothing already there is ever offered.
 */
export function BuildSuggestions({
  suggestions,
  busy,
  onPick,
  onDismiss,
  onGenerateImages,
  imagesBusy,
}: {
  suggestions: BuildSuggestion[];
  busy: boolean;
  onPick: (suggestion: BuildSuggestion) => void;
  onDismiss: () => void;
  /** Making photographs is not a chat edit, so it gets its own action. */
  onGenerateImages?: () => void;
  imagesBusy?: boolean;
}) {
  if (suggestions.length === 0 && !onGenerateImages) return null;

  const pages = suggestions.filter((item) => item.kind === 'page');
  const sections = suggestions.filter((item) => item.kind === 'section');

  return (
    <div className="lumen-panel mr-4 space-y-3 rounded-[14px] border border-accent/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Build the rest</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
            Your site is up. Press any of these and Lumen writes it now — one at a time, so you see each
            one land.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Hide suggestions"
          className="-mr-1 -mt-1 shrink-0 rounded-pill px-2 py-0.5 text-[16px] leading-none text-ink-muted transition hover:text-ink-primary"
        >
          ×
        </button>
      </div>

      {pages.length > 0 ? (
        <Group title="Pages" items={pages} busy={busy} onPick={onPick} emphasis />
      ) : null}
      {sections.length > 0 ? (
        <Group title="Add to the site" items={sections} busy={busy} onPick={onPick} />
      ) : null}

      {onGenerateImages ? (
        <div>
          <p className="mb-1.5 text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">Pictures</p>
          <button
            type="button"
            disabled={busy || imagesBusy}
            onClick={onGenerateImages}
            className="lumen-raise flex w-full items-center gap-3 rounded-[11px] border border-hairline px-3 py-2.5 text-left transition hover:border-accent/40 disabled:opacity-40"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-ink-primary">Generate photos for this site</span>
              <span className="mt-0.5 block text-[11.5px] text-ink-muted">
                Four made for this business, not stock. Takes about a minute.
              </span>
            </span>
            <span className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              {imagesBusy ? '…' : 'Make'}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Group({
  title,
  items,
  busy,
  onPick,
  emphasis,
}: {
  title: string;
  items: BuildSuggestion[];
  busy: boolean;
  onPick: (suggestion: BuildSuggestion) => void;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">{title}</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(item)}
            className={cn(
              'lumen-raise flex w-full items-center gap-3 rounded-[11px] border px-3 py-2.5 text-left transition disabled:opacity-40',
              emphasis
                ? 'border-accent/40 bg-accent-soft hover:border-accent'
                : 'border-hairline hover:border-accent/40',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[13px]', emphasis ? 'text-accent' : 'text-ink-primary')}>
                {item.label}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-ink-muted">{item.hint}</span>
            </span>
            <span className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              {busy ? '…' : 'Build'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/components/ui/cn';

interface Look {
  id: string;
  name: string;
  note: string;
  swatch: { bg: string; surface: string; ink: string; accent: string; radius: string };
}

/**
 * Three looks, shown rather than described.
 *
 * A tiny drawing of the site in each palette, because "Soft, light and roomy"
 * means nothing until you can see it next to the other two. Picking one
 * rewrites the stylesheet and nothing else, so it is instant and it cannot
 * touch a word of anyone's content.
 */
export function LookPicker({
  projectId,
  onApplied,
  compact = false,
}: {
  projectId: string;
  onApplied?: (name: string) => void;
  compact?: boolean;
}) {
  const [looks, setLooks] = useState<Look[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/projects/${projectId}/design`)
      .then((response) => (response.ok ? response.json() : { variants: [] }))
      .then((payload) => {
        if (live) setLooks(Array.isArray(payload.variants) ? payload.variants : []);
      })
      .catch(() => {
        // A look is an offer, not something the page depends on.
        if (live) setLooks([]);
      });
    return () => {
      live = false;
    };
  }, [projectId]);

  async function apply(look: Look) {
    setBusy(look.id);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/design`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variantId: look.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not change the look');
      setApplied(look.id);
      onApplied?.(look.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change the look');
    } finally {
      setBusy(null);
    }
  }

  if (!looks || looks.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'sm:grid-cols-3')}>
        {looks.map((look) => (
          <button
            key={look.id}
            type="button"
            disabled={busy !== null}
            onClick={() => void apply(look)}
            className={cn(
              'lumen-raise overflow-hidden rounded-[12px] border text-left transition disabled:opacity-60',
              applied === look.id ? 'border-accent/60' : 'border-hairline hover:border-accent/40',
            )}
          >
            {/* The site, in miniature. Drawn from the same tokens the real
                stylesheet uses, so it cannot claim a look the page will not
                have. */}
            <span
              aria-hidden
              className="block h-[74px] w-full p-2.5"
              style={{ background: look.swatch.bg }}
            >
              <span
                className="mb-1.5 block h-[7px] w-3/5"
                style={{ background: look.swatch.ink, opacity: 0.85, borderRadius: look.swatch.radius }}
              />
              <span
                className="mb-2 block h-[5px] w-2/5"
                style={{ background: look.swatch.ink, opacity: 0.4, borderRadius: look.swatch.radius }}
              />
              <span className="flex gap-1.5">
                <span
                  className="block h-[14px] w-[34px]"
                  style={{ background: look.swatch.accent, borderRadius: look.swatch.radius }}
                />
                <span
                  className="block h-[14px] flex-1"
                  style={{ background: look.swatch.surface, borderRadius: look.swatch.radius }}
                />
              </span>
            </span>

            <span className="block border-t border-hairline px-2.5 py-2">
              <span
                className={cn(
                  'block text-[12.5px]',
                  applied === look.id ? 'text-accent' : 'text-ink-primary',
                )}
              >
                {busy === look.id ? 'Applying…' : applied === look.id ? `${look.name} ✓` : look.name}
              </span>
              {!compact ? (
                <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">{look.note}</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      {error ? <p className="text-[12px] text-[#e5735a]">{error}</p> : null}
      <p className="text-[11px] leading-relaxed text-ink-muted">
        Only the styling changes — your words and pictures stay exactly as they are. Undo from version
        history.
      </p>
    </div>
  );
}

'use client';

import { asHex } from '@/lib/theme-tokens';
import type { PaletteToken } from './Inspector';

/**
 * The site's palette, edited once and applied everywhere.
 *
 * This is what "change the colours" should always have meant. Picking a colour
 * on a single element only ever repainted that element; the theme lives in the
 * stylesheet, so changing it here changes every heading, every button and every
 * band on every page at once.
 */
export function ThemePanel({
  palette,
  onToken,
  loading,
}: {
  palette: PaletteToken[];
  onToken: (name: string, value: string) => void;
  loading: boolean;
}) {
  if (loading && palette.length === 0) {
    return <p className="p-4 text-[12px] text-ink-muted">Reading the site&rsquo;s palette…</p>;
  }

  if (palette.length === 0) {
    return (
      <p className="p-4 text-[12px] leading-relaxed text-ink-muted">
        This page does not define a palette, so there is nothing to change site-wide. You can still
        recolour anything by selecting it in the page.
      </p>
    );
  }

  return (
    <div className="space-y-1 p-3">
      <p className="px-1 pb-1 text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">Colours</p>

      {palette.map((token) => {
        const hex = asHex(token.value);
        return (
          <label
            key={token.name}
            className="lumen-raise flex items-center gap-3 rounded-[10px] border border-hairline p-2.5"
          >
            <span
              className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[8px] border border-hairline"
              style={{ background: token.value }}
            >
              {/* The native picker sits invisibly on the swatch, so the swatch
                  is the control rather than a decoration next to one. */}
              <input
                type="color"
                value={hex ?? '#000000'}
                onChange={(event) => onToken(token.name, event.target.value)}
                aria-label={token.label}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] text-ink-primary">{token.label}</span>
              <span className="block truncate font-mono text-[10.5px] text-ink-muted">
                {hex ?? token.value}
              </span>
            </span>
          </label>
        );
      })}

      <p className="px-1 pt-2 text-[11px] leading-relaxed text-ink-muted">
        Changes show immediately and apply to every page. Save to keep them.
      </p>
    </div>
  );
}

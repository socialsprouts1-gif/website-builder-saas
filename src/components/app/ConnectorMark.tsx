import { cn } from '@/components/ui/cn';
import { BRAND_MARKS } from '@/components/app/brand-marks';

/**
 * Provider marks.
 *
 * The brand's own logo where there is one, in the brand's own colour, on a tile
 * neutral enough to carry any of them. Where there is no brand — a custom
 * domain, a booking calendar — a drawn glyph in Lumen's own ink, so a grid that
 * mixes the two does not look half-finished.
 */
const DRAWN: Record<string, React.ReactNode> = {
  custom_domain: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" strokeWidth="1.8" stroke="currentColor" />
      <path
        d="M3 12h18M12 3c2.7 3 2.7 15 0 18M12 3c-2.7 3-2.7 15 0 18"
        fill="none"
        strokeWidth="1.8"
        stroke="currentColor"
      />
    </>
  ),
  booking: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" fill="none" strokeWidth="1.8" stroke="currentColor" />
      <path d="M3.5 9.5h17M8.5 3v4M15.5 3v4" fill="none" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" />
      <path
        d="m9 14.5 2.2 2.2 4.3-4.3"
        fill="none"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

export function ConnectorMark({
  provider,
  name,
  connected,
}: {
  provider: string;
  name: string;
  connected: boolean;
}) {
  const brand = BRAND_MARKS[provider];
  const drawn = DRAWN[provider];

  return (
    <span
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border transition',
        // The tile stays neutral even when connected: a brand colour inside a
        // lime tile is a colour clash, and the dot below already says connected.
        connected ? 'border-accent/40 bg-white/[0.06]' : 'border-hairline bg-white/[0.03]',
        brand ? '' : connected ? 'text-accent' : 'text-ink-secondary',
      )}
      aria-hidden
    >
      {brand ? (
        <svg width="19" height="19" viewBox="0 0 24 24" fill={brand.colour} role="presentation">
          <path d={brand.path} />
        </svg>
      ) : drawn ? (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          {drawn}
        </svg>
      ) : (
        <span className="font-display text-[15px] leading-none">{name.slice(0, 1)}</span>
      )}

      {connected ? (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-pill border-2 border-[var(--surface-raised)] bg-accent" />
      ) : null}
    </span>
  );
}

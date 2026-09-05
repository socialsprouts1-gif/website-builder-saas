import { cn } from '@/components/ui/cn';

/**
 * Provider marks.
 *
 * Deliberately not brand logos: a wall of multicolour logos fights Lumen's
 * single-accent identity, and hotlinked brand assets break. These are simple
 * strokes in the accent colour, with a monogram fallback for anything without
 * a drawn mark, so the grid stays legible and on-system as providers are added.
 */

const PATHS: Record<string, React.ReactNode> = {
  github: (
    <path d="M8 1.5a6.5 6.5 0 0 0-2.05 12.67c.32.06.44-.14.44-.31v-1.2c-1.8.4-2.19-.77-2.19-.77-.3-.75-.72-.95-.72-.95-.6-.4.04-.4.04-.4.65.05 1 .67 1 .67.58 1 1.53.71 1.9.54.06-.42.23-.71.42-.87-1.44-.16-2.96-.72-2.96-3.2 0-.71.26-1.29.67-1.74-.07-.17-.29-.83.06-1.72 0 0 .55-.18 1.8.66a6.2 6.2 0 0 1 3.28 0c1.25-.84 1.8-.66 1.8-.66.35.89.13 1.55.06 1.72.42.45.67 1.03.67 1.73 0 2.49-1.52 3.04-2.97 3.2.24.2.44.6.44 1.2v1.78c0 .17.12.38.45.31A6.5 6.5 0 0 0 8 1.5Z" />
  ),
  vercel: <path d="M8 2 14.5 13.5h-13L8 2Z" />,
  netlify: <path d="M8 1.8 14.2 8 8 14.2 1.8 8 8 1.8Zm0 3.4L5.2 8 8 10.8 10.8 8 8 5.2Z" />,
  custom_domain: (
    <>
      <circle cx="8" cy="8" r="6" fill="none" strokeWidth="1.3" stroke="currentColor" />
      <path d="M2 8h12M8 2c1.8 2 1.8 10 0 12M8 2c-1.8 2-1.8 10 0 12" fill="none" strokeWidth="1.3" stroke="currentColor" />
    </>
  ),
  slack: (
    <path d="M4 9.8a1.3 1.3 0 1 1-1.3-1.3H4v1.3Zm.7 0a1.3 1.3 0 0 1 2.6 0v3.2a1.3 1.3 0 0 1-2.6 0V9.8ZM6 4a1.3 1.3 0 1 1 1.3-1.3V4H6Zm0 .7a1.3 1.3 0 0 1 0 2.6H2.8a1.3 1.3 0 0 1 0-2.6H6ZM12 6a1.3 1.3 0 1 1 1.3 1.3H12V6Zm-.7 0a1.3 1.3 0 0 1-2.6 0V2.8a1.3 1.3 0 0 1 2.6 0V6ZM10 12a1.3 1.3 0 1 1-1.3 1.3V12H10Zm0-.7a1.3 1.3 0 0 1 0-2.6h3.2a1.3 1.3 0 0 1 0 2.6H10Z" />
  ),
  notion: (
    <>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.6" fill="none" strokeWidth="1.3" stroke="currentColor" />
      <path d="M6 11V5.6l4 5.4V5" fill="none" strokeWidth="1.3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  airtable: <path d="M8 2 14 4.6 8 7.2 2 4.6 8 2ZM2 6.4l5.4 2.3v4.9L2 11.3V6.4Zm12 0v4.9l-5.4 2.3V8.7L14 6.4Z" />,
  google_sheets: (
    <>
      <rect x="3" y="2" width="10" height="12" rx="1.4" fill="none" strokeWidth="1.3" stroke="currentColor" />
      <path d="M5.5 6.5h5M5.5 9h5M8 6.5V11" fill="none" strokeWidth="1.2" stroke="currentColor" />
    </>
  ),
  google_analytics: (
    <path d="M3 13V9.5a1.3 1.3 0 0 1 2.6 0V13a1.3 1.3 0 0 1-2.6 0Zm3.7 0V6.6a1.3 1.3 0 1 1 2.6 0V13a1.3 1.3 0 0 1-2.6 0Zm3.7 0V3.6a1.3 1.3 0 1 1 2.6 0V13a1.3 1.3 0 0 1-2.6 0Z" />
  ),
  mailchimp: (
    <>
      <path d="M2.5 6.5 8 3l5.5 3.5v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-6Z" fill="none" strokeWidth="1.3" stroke="currentColor" />
      <path d="m2.8 6.8 5.2 3.4 5.2-3.4" fill="none" strokeWidth="1.3" stroke="currentColor" />
    </>
  ),
  zapier: <path d="M8 1.6 9.3 6l4.4-1.3-2.6 3.3 2.6 3.3L9.3 10 8 14.4 6.7 10l-4.4 1.3L4.9 8 2.3 4.7 6.7 6 8 1.6Z" />,
  hubspot: (
    <>
      <circle cx="11.6" cy="4.6" r="1.6" fill="none" strokeWidth="1.3" stroke="currentColor" />
      <circle cx="8" cy="10.6" r="2.8" fill="none" strokeWidth="1.3" stroke="currentColor" />
      <path d="M8 7.8V5.4H4.4M10.4 5.8 8.9 8.2" fill="none" strokeWidth="1.3" stroke="currentColor" />
    </>
  ),
  stripe: <path d="M7.4 6.3c0-.5.45-.7 1.1-.7.95 0 2.15.3 3.1.82V3.6A8 8 0 0 0 8.5 3C6.35 3 5 4.15 5 6.05c0 2.95 4 2.47 4 3.75 0 .6-.5.8-1.2.8-1.03 0-2.4-.43-3.45-1v2.9c1.1.48 2.25.72 3.45.72 2.2 0 3.7-1.1 3.7-3.02 0-3.2-4.1-2.62-4.1-3.9Z" />,
  razorpay_checkout: <path d="m5.6 14 4.9-8.4-3.1.85L6 14H2.6L7 1.3l4.6-1.1-5.4 9.3 3.4-.9L6.9 14H5.6Z" />,
  shopify: (
    <>
      <path d="M4 5h8l.7 8.5a.8.8 0 0 1-.8.9H4.1a.8.8 0 0 1-.8-.9L4 5Z" fill="none" strokeWidth="1.3" stroke="currentColor" />
      <path d="M6 6.4V4.6a2 2 0 1 1 4 0v1.8" fill="none" strokeWidth="1.3" stroke="currentColor" />
    </>
  ),
  booking: (
    <>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.4" fill="none" strokeWidth="1.3" stroke="currentColor" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" fill="none" strokeWidth="1.3" stroke="currentColor" strokeLinecap="round" />
      <path d="m6 10 1.5 1.5L10.5 8.5" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
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
  const drawn = PATHS[provider];

  return (
    <span
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border transition',
        connected ? 'border-accent/40 bg-accent-soft text-accent' : 'border-hairline bg-white/[0.03] text-ink-secondary',
      )}
      aria-hidden
    >
      {drawn ? (
        <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor">
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

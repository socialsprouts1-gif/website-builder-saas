import { cn } from './cn';

type BadgeTone = 'neutral' | 'accent' | 'positive' | 'warning';

const toneDot: Record<BadgeTone, string> = {
  neutral: 'bg-ink-muted',
  accent: 'bg-accent',
  positive: 'bg-accent',
  warning: 'bg-[#c46026]',
};

export function Badge({
  children,
  tone = 'neutral',
  dot = true,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border border-hairline px-3 py-1.5',
        'text-[11px] uppercase tracking-[0.14em] text-ink-secondary',
        className,
      )}
    >
      {dot ? (
        <span className={cn('h-1.5 w-1.5 rounded-pill', toneDot[tone], tone === 'accent' && 'animate-pulse-dot')} />
      ) : null}
      {children}
    </span>
  );
}

/** The site-wide beta pill from the hero, kept as its own component for reuse. */
export function BetaBadge({ className }: { className?: string }) {
  return (
    <Badge tone="accent" className={className}>
      Now in public beta · V0.9
    </Badge>
  );
}

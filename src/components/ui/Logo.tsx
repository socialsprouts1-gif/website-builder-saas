import Link from 'next/link';
import { cn } from './cn';

/** Three connected nodes forming a spark — the Lumen mark. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[8px] bg-accent"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="4" r="2.1" fill="var(--accent-ink)" />
        <circle cx="4.2" cy="14.4" r="2.1" fill="var(--accent-ink)" />
        <circle cx="15.8" cy="14.4" r="2.1" fill="var(--accent-ink)" />
        <path
          d="M10 4 4.2 14.4M10 4l5.8 10.4M4.2 14.4h11.6"
          stroke="var(--accent-ink)"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    </span>
  );
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-display text-[19px] tracking-tight text-ink-primary">Lumen</span>
    </Link>
  );
}

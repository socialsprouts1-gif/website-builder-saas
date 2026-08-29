'use client';

import { cn } from './cn';

export function CategoryChip({
  label,
  active = false,
  onClick,
  className,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-pill border px-3.5 py-1.5 text-[13px] transition',
        active
          ? 'border-accent/45 bg-accent-soft text-accent'
          : 'border-hairline text-ink-secondary hover:border-white/20 hover:text-ink-primary',
        className,
      )}
    >
      {label}
    </button>
  );
}

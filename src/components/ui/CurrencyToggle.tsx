'use client';

import { cn } from '@/components/ui/cn';
import type { Currency } from '@/lib/plans';

/**
 * Rupees or dollars, for the reader rather than for the invoice.
 *
 * Every charge is in INR through Razorpay. This changes what the numbers say,
 * not what the card is debited, and the screens carrying it say so underneath —
 * a converted figure that reads like the amount being charged is a surprise on
 * somebody's statement two days later.
 */
export function CurrencyToggle({
  value,
  onChange,
  className,
}: {
  value: Currency;
  onChange: (currency: Currency) => void;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-center gap-2 text-[12.5px] text-ink-muted', className)}
      role="group"
      aria-label="Show prices in"
    >
      <span>Show prices in</span>
      <div className="flex rounded-pill border border-hairline p-0.5">
        {(['INR', 'USD'] as Currency[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            className={cn(
              'rounded-pill px-3 py-1 transition',
              value === option ? 'bg-white/10 text-ink-primary' : 'text-ink-muted hover:text-ink-secondary',
            )}
          >
            {option === 'INR' ? '₹ INR' : '$ USD'}
          </button>
        ))}
      </div>
    </div>
  );
}

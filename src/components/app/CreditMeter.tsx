import Link from 'next/link';
import { cn } from '@/components/ui/cn';

/**
 * The daily allowance, always visible (spec Section 17: never make the user
 * guess what a long-running or metered action will cost them).
 */
export function CreditMeter({
  used,
  limit,
  resetsAt,
  hasOwnKey,
  platformConfigured,
  tier = 'free',
  unlimited = false,
  variant = 'nav',
}: {
  used: number;
  limit: number;
  resetsAt: string;
  hasOwnKey: boolean;
  platformConfigured: boolean;
  tier?: 'admin' | 'pro' | 'free';
  unlimited?: boolean;
  variant?: 'nav' | 'panel';
}) {
  if (unlimited) {
    return (
      <div className={wrapper(variant)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Credits</span>
          <span className="text-[12px] text-accent">Unlimited</span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">
          Admin account — nothing is metered.
        </p>
      </div>
    );
  }

  if (hasOwnKey) {
    return (
      <div className={wrapper(variant)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Credits</span>
          <span className="text-[12px] text-accent">Unlimited</span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">
          Running on your own OpenAI key.
        </p>
      </div>
    );
  }

  if (!platformConfigured) {
    return (
      <div className={wrapper(variant)}>
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Credits</span>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">
          No shared key on this deployment —{' '}
          <Link href="/app/settings/api-keys" className="text-accent hover:underline">
            add your own
          </Link>
          .
        </p>
      </div>
    );
  }

  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const empty = remaining === 0;

  return (
    <div className={wrapper(variant)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          {tier === 'pro' ? 'Pro credits' : 'Free credits'}
        </span>
        <span className={cn('text-[12.5px]', empty ? 'text-[#e5735a]' : 'text-ink-primary')}>
          {remaining} / {limit}
        </span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-pill bg-white/10" role="presentation">
        <div
          className={cn('h-full rounded-pill transition-all', empty ? 'bg-[#e5735a]' : 'bg-accent')}
          style={{ width: `${100 - pct}%` }}
        />
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
        {empty ? (
          <>
            Used up — resets {formatReset(resetsAt)}. Your sites stay live.{' '}
            {tier === 'free' ? (
              <>
                <Link href="/app/settings/billing" className="text-accent hover:underline">
                  Upgrade
                </Link>{' '}
                for more, or{' '}
              </>
            ) : null}
            <Link href="/app/settings/api-keys" className="text-accent hover:underline">
              add your own key
            </Link>{' '}
            for no limit.
          </>
        ) : (
          <>A new site costs 3, each edit costs 1. Resets {formatReset(resetsAt)}.</>
        )}
      </p>
    </div>
  );
}

function wrapper(variant: 'nav' | 'panel') {
  return variant === 'nav'
    ? 'rounded-[10px] border border-hairline px-3 py-2.5'
    : 'rounded-card border border-hairline bg-raised px-4 py-3.5';
}

function formatReset(resetsAt: string): string {
  const reset = new Date(resetsAt);
  const hoursAway = Math.max(0, Math.round((reset.getTime() - Date.now()) / 3_600_000));
  if (hoursAway <= 1) return 'within the hour';
  return `in ${hoursAway}h`;
}

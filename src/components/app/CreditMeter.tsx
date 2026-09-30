import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import { CREDIT_COST } from '@/lib/env';
import { meterReading, refills, totalCredits, type CreditBalance } from '@/lib/credits';

/** Quoted in one place so the meter can never advertise the wrong price. */
const SITE_COST = CREDIT_COST.generation;

/**
 * What is left, always visible (spec Section 17: never make the user guess
 * what a long-running or metered action will cost them).
 *
 * The free tier is a grant rather than a daily bucket, so this must never say
 * "resets in 4h" over a number that is not coming back. Which of the two it is
 * comes from the balance itself.
 */
export function CreditMeter({
  balance,
  resetsAt,
  hasOwnKey,
  platformConfigured,
  variant = 'nav',
}: {
  balance: CreditBalance;
  resetsAt: string;
  hasOwnKey: boolean;
  platformConfigured: boolean;
  variant?: 'nav' | 'panel';
}) {
  if (balance.unlimited) {
    return (
      <Shell variant={variant} label="Credits" value={<span className="text-accent">Unlimited</span>}>
        Admin account — nothing is metered.
      </Shell>
    );
  }

  if (hasOwnKey) {
    return (
      <Shell variant={variant} label="Credits" value={<span className="text-accent">Unlimited</span>}>
        Running on your own OpenAI key.
      </Shell>
    );
  }

  if (!platformConfigured) {
    return (
      <Shell variant={variant} label="Credits">
        No shared key on this deployment —{' '}
        <Link href="/app/settings/api-keys" className="text-accent hover:underline">
          add your own
        </Link>
        .
      </Shell>
    );
  }

  const reading = meterReading(balance);
  const empty = totalCredits(balance) === 0;
  const pct = reading.outOf > 0 ? Math.min(100, (reading.left / reading.outOf) * 100) : 0;

  return (
    <div className={wrapper(variant)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">{reading.label}</span>
        <span className={cn('text-[12.5px]', empty ? 'text-[#e5735a]' : 'text-ink-primary')}>
          {reading.left} / {reading.outOf}
        </span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-pill bg-white/10" role="presentation">
        <div
          className={cn('h-full rounded-pill transition-all', empty ? 'bg-[#e5735a]' : 'bg-accent')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
        {empty ? (
          <>
            {refills(balance) ? (
              <>Used up — more {formatReset(resetsAt)}. </>
            ) : (
              <>All used. Your sites stay live and exportable. </>
            )}
            {balance.tier === 'free' ? (
              <>
                <Link href="/app/settings/billing" className="text-accent hover:underline">
                  Upgrade
                </Link>{' '}
                to keep building, or{' '}
              </>
            ) : null}
            <Link href="/app/settings/api-keys" className="text-accent hover:underline">
              add your own key
            </Link>{' '}
            for no limit.
          </>
        ) : (
          <>
            A new site costs {SITE_COST}, each change costs 1.{' '}
            {refills(balance) ? <>Resets {formatReset(resetsAt)}.</> : <>These do not reset.</>}
          </>
        )}
      </p>
    </div>
  );
}

function Shell({
  variant,
  label,
  value,
  children,
}: {
  variant: 'nav' | 'panel';
  label: string;
  value?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={wrapper(variant)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">{label}</span>
        {value ? <span className="text-[12px]">{value}</span> : null}
      </div>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">{children}</p>
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

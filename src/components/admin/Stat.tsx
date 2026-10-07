import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';

/**
 * One number, with what it means under it.
 *
 * `href` turns it into the way into the screen that explains it, which is the
 * whole point of the overview: a number nobody can click is a number you then
 * have to go and find the page for.
 */
export function Stat({
  label,
  value,
  detail,
  href,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  href?: string;
  /** Draws attention when there is something to deal with. */
  tone?: 'alert';
}) {
  const inner = (
    <Card
      className={cn(
        'space-y-1',
        href && 'transition hover:border-accent/45',
        tone === 'alert' && 'border-[#e5a05a]/40',
      )}
    >
      <p className="text-[13px] uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className={cn('font-display text-2xl', tone === 'alert' ? 'text-[#e5a05a]' : 'text-ink-primary')}>
        {value}
      </p>
      <p className="text-[14px] text-ink-muted">{detail}</p>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/** The scrolling box every admin table lives in. */
export function AdminTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    // A table of several columns cannot become a phone-width table, so it
    // scrolls sideways inside its own box rather than squeezing every column to
    // two characters or pushing the page wider than the screen.
    <div className="overflow-x-auto rounded-card border border-hairline">
      <table className="w-full min-w-[520px] text-left text-[15px]">
        <thead className="bg-raised text-[13px] uppercase tracking-[0.12em] text-ink-muted">
          <tr>
            {head.map((column) => (
              <th key={column} className="px-4 py-3 font-normal">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[15px] text-ink-muted">
      {children}
    </p>
  );
}

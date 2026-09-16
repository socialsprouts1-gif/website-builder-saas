import { pageLabel } from '@/lib/pages';
import type { TrafficSummary } from '@/lib/traffic';

/**
 * Whether anyone actually came.
 *
 * The question an owner has is not "what is my bounce rate", it is "is this
 * thing working". So the answer leads with one number — people, this week —
 * against the same number last week, because a direction is worth more than a
 * figure on its own.
 */
export function TrafficPanel({ traffic, leadsThisWeek }: { traffic: TrafficSummary; leadsThisWeek: number }) {
  const { visitors, visitorsBefore, views, pages, daily } = traffic;
  const change = visitorsBefore > 0 ? Math.round(((visitors - visitorsBefore) / visitorsBefore) * 100) : null;
  const peak = Math.max(1, ...daily.map((entry) => entry.views));

  return (
    <div className="space-y-4 rounded-card border border-hairline bg-raised p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Figure
          value={visitors}
          label="people this week"
          note={
            change === null
              ? visitors === 0
                ? 'no visits yet'
                : 'first week of counting'
              : `${change >= 0 ? '+' : ''}${change}% on last week`
          }
          tone={change !== null && change < 0 ? 'down' : 'up'}
        />
        <Figure value={views} label="pages viewed" />
        <Figure
          value={leadsThisWeek}
          label={leadsThisWeek === 1 ? 'got in touch' : 'got in touch'}
          note={visitors > 0 ? `${Math.round((leadsThisWeek / visitors) * 100)}% of visitors` : undefined}
        />
      </div>

      {/* Fourteen bars. Not a chart library: the shape is the whole message. */}
      <div className="flex items-end gap-[3px]" aria-hidden>
        {daily.map((entry) => (
          <span
            key={entry.day}
            title={`${entry.day}: ${entry.views}`}
            className="flex-1 rounded-t-[2px] bg-accent/45"
            style={{ height: `${Math.max(2, Math.round((entry.views / peak) * 44))}px` }}
          />
        ))}
      </div>
      <p className="text-[11px] text-ink-muted">Last 14 days</p>

      {pages.length > 0 ? (
        <div className="border-t border-hairline pt-3">
          <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
            Most visited this week
          </p>
          <ul className="space-y-1">
            {pages.map((entry) => (
              <li key={entry.path} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="truncate text-ink-secondary">{pageLabel(entry.path)}</span>
                <span className="shrink-0 text-ink-muted">{entry.views}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-[11px] leading-relaxed text-ink-muted">
        Counted on our server as pages are served — no cookies, no tracking script, and nothing that
        identifies anyone. Obvious bots are left out.
      </p>
    </div>
  );
}

function Figure({
  value,
  label,
  note,
  tone,
}: {
  value: number;
  label: string;
  note?: string;
  tone?: 'up' | 'down';
}) {
  return (
    <div>
      <p className="font-display text-[30px] leading-none text-ink-primary">{value}</p>
      <p className="mt-1.5 text-[12.5px] text-ink-secondary">{label}</p>
      {note ? (
        <p className={`mt-0.5 text-[11.5px] ${tone === 'down' ? 'text-[#e5a15a]' : 'text-ink-muted'}`}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

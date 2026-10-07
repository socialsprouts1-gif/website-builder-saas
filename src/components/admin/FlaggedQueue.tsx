'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { resolveFlagAction } from '@/app/admin/flagged/actions';
import type { FlaggedRow } from '@/lib/admin-metrics';

/**
 * The moderation queue, which can now be emptied.
 *
 * The resolved row is removed optimistically and put back if the server
 * refuses, because the alternative — a full page reload per item — makes
 * working through twenty of them unpleasant enough that nobody does.
 */
export function FlaggedQueue({ rows }: { rows: FlaggedRow[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const waiting = rows.filter((row) => !done.has(row.id));

  function resolve(id: string) {
    setError(null);
    setDone((current) => new Set(current).add(id));
    start(async () => {
      const result = await resolveFlagAction(id);
      if (!result.ok) {
        setDone((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        setError(result.error ?? 'That did not save. Try again.');
      }
    });
  }

  if (waiting.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[15px] text-ink-muted">
        Queue cleared.
      </p>
    );
  }

  return (
    <>
      {error ? (
        <p className="mb-4 rounded-card border border-[#e5735a]/35 bg-[#e5735a]/10 px-4 py-3 text-[14.5px] text-[#e5735a]">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {waiting.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-start gap-3 rounded-card border border-hairline bg-raised px-4 py-3.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[15.5px] text-ink-primary">{row.reason}</p>
              {row.detail ? (
                <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{row.detail}</p>
              ) : null}
              <p className="mt-1.5 text-[13.5px] text-ink-muted">
                {new Date(row.createdAt).toLocaleString('en-IN')}
                {row.projectId ? (
                  <>
                    {' · '}
                    <Link
                      href={`/app/project/${row.projectId}`}
                      className="underline underline-offset-4 transition hover:text-ink-primary"
                    >
                      open the site
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => resolve(row.id)} disabled={pending}>
              Mark resolved
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

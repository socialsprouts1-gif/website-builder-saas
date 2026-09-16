import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { STEP_TIMEOUT_MS } from '@/lib/generation/runner';

export const metadata: Metadata = { title: 'What went wrong' };
export const dynamic = 'force-dynamic';

/**
 * Failures, where someone can read them.
 *
 * Built after a build ran for two hours writing the same page over and over
 * with nothing anywhere saying so. Two questions, in the order they get asked:
 * is anything stuck right now, and what has been failing.
 */
export default async function ErrorsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [events, jobs] = await Promise.all([
    admin
      .from('error_events')
      .select('id, scope, message, detail, project_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    // A job still marked running whose heartbeat stopped. This is the shape the
    // two-hour hang had, and nothing was watching for it.
    admin
      .from('generation_jobs')
      .select('id, project_id, stage, progress, created_at')
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const now = Date.now();
  const stuck = (jobs.data ?? []).filter((job) => {
    const progress = job.progress as { stepStartedAt?: string } | null;
    const since = progress?.stepStartedAt ?? job.created_at;
    return now - new Date(since).getTime() > STEP_TIMEOUT_MS;
  });

  const byScope = new Map<string, number>();
  for (const event of events.data ?? []) byScope.set(event.scope, (byScope.get(event.scope) ?? 0) + 1);
  const scopes = [...byScope.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-[28px] leading-tight text-ink-primary">What went wrong</h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
        Failures the product handled quietly, written down so they are not invisible.
      </p>

      {events.error ? (
        <p className="mt-6 rounded-card border border-[#e5a15a]/30 bg-[#e5a15a]/10 px-4 py-3.5 text-[13px] leading-relaxed text-[#e5a15a]">
          The error table is not in your database yet — it arrives in migration 0014. Run
          supabase/setup.sql. Until then, failures go to the server log only.
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-[19px] text-ink-primary">Builds running now</h2>
        {(jobs.data ?? []).length === 0 ? (
          <p className="rounded-card border border-hairline bg-raised px-4 py-3.5 text-[13px] text-ink-muted">
            Nothing is building.
          </p>
        ) : (
          <ul className="space-y-2">
            {(jobs.data ?? []).map((job) => {
              const progress = job.progress as { stepStartedAt?: string; message?: string } | null;
              const since = progress?.stepStartedAt ?? job.created_at;
              const quiet = Math.round((now - new Date(since).getTime()) / 1000);
              const isStuck = stuck.some((candidate) => candidate.id === job.id);

              return (
                <li
                  key={job.id}
                  className={`rounded-card border px-4 py-3 ${
                    isStuck ? 'border-[#e5735a]/40 bg-[#e5735a]/10' : 'border-hairline bg-raised'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-[12px] text-ink-secondary">{job.project_id}</span>
                    <span className={`text-[12px] ${isStuck ? 'text-[#e5735a]' : 'text-ink-muted'}`}>
                      {isStuck ? `silent for ${quiet}s — presumed stuck` : `${quiet}s since last word`}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    {job.stage} · {progress?.message ?? 'no message'}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {scopes.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-[19px] text-ink-primary">Where it fails most</h2>
          <div className="flex flex-wrap gap-2">
            {scopes.map(([scope, count]) => (
              <span
                key={scope}
                className="rounded-pill border border-hairline px-3 py-1.5 font-mono text-[11.5px] text-ink-secondary"
              >
                {scope} <span className="text-ink-muted">×{count}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-[19px] text-ink-primary">Lately</h2>
        {(events.data ?? []).length === 0 ? (
          <p className="rounded-card border border-hairline bg-raised px-4 py-3.5 text-[13px] text-ink-muted">
            Nothing recorded. Either all is well, or migration 0014 has not run.
          </p>
        ) : (
          <ul className="space-y-2">
            {(events.data ?? []).map((event) => (
              <li key={event.id} className="rounded-card border border-hairline bg-raised px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[11.5px] text-accent">{event.scope}</span>
                  <span className="text-[11.5px] text-ink-muted">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 break-words text-[13px] leading-relaxed text-ink-secondary">
                  {event.message}
                </p>
                {event.detail ? (
                  <p className="mt-1 break-words font-mono text-[11px] text-ink-muted">
                    {JSON.stringify(event.detail)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

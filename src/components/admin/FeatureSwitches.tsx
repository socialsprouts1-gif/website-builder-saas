'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/components/ui/cn';
import { setFeatureAction } from '@/app/admin/features/actions';
import type { FeatureDefinition, FeatureKey } from '@/lib/features';
import { FEATURE_BY_KEY } from '@/lib/features';

/**
 * The global switches.
 *
 * Optimistic, and put back if the server refuses: an admin flipping eight of
 * these in a row should not wait for a round trip on each, and a switch that
 * silently did nothing would be worse than one that is slow.
 */
export function FeatureSwitches({
  groups,
  flags,
}: {
  groups: { group: string; features: FeatureDefinition[] }[];
  flags: Partial<Record<FeatureKey, boolean>>;
}) {
  const [state, setState] = useState<Partial<Record<FeatureKey, boolean>>>(flags);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isOn = (key: FeatureKey) => state[key] ?? FEATURE_BY_KEY[key].on;

  function flip(key: FeatureKey) {
    const next = !isOn(key);
    const previous = state[key];
    setState((current) => ({ ...current, [key]: next }));
    setError(null);

    start(async () => {
      const result = await setFeatureAction(key, next);
      if (!result.ok) {
        setState((current) => ({ ...current, [key]: previous }));
        setError(result.error ?? 'That did not save.');
      }
    });
  }

  return (
    <>
      {error ? (
        <p className="mb-4 rounded-card border border-[#e5735a]/35 bg-[#e5735a]/10 px-4 py-3 text-[14.5px] text-[#e5735a]">
          {error}
        </p>
      ) : null}

      {groups.map((entry) => (
        <section key={entry.group} className="mt-8 first:mt-6">
          <h2 className="mb-3 text-[13px] uppercase tracking-[0.14em] text-ink-muted">{entry.group}</h2>
          <ul className="overflow-hidden rounded-card border border-hairline">
            {entry.features.map((feature) => {
              const on = isOn(feature.key);
              return (
                <li
                  key={feature.key}
                  className="flex flex-wrap items-center gap-4 border-b border-hairline bg-raised px-4 py-3.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15.5px] text-ink-primary">
                      {feature.label}
                      {feature.plan ? (
                        <span className="ml-2 rounded-pill border border-hairline px-2 py-0.5 text-[11.5px] uppercase tracking-[0.08em] text-ink-muted">
                          also needs the plan
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-ink-muted">{feature.blurb}</p>
                  </div>
                  <Switch on={on} pending={pending} onFlip={() => flip(feature.key)} label={feature.label} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

/** A real checkbox under the paint, so it is reachable by keyboard and reads correctly. */
export function Switch({
  on,
  pending,
  onFlip,
  label,
}: {
  on: boolean;
  pending?: boolean;
  onFlip: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label} — ${on ? 'on' : 'off'}`}
      disabled={pending}
      onClick={onFlip}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-pill border transition disabled:opacity-60',
        on ? 'border-accent/60 bg-accent' : 'border-hairline bg-[var(--bg-base-deep)]',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all',
          on ? 'left-[1.6rem] bg-[var(--surface-raised)]' : 'left-1 bg-ink-muted',
        )}
      />
    </button>
  );
}

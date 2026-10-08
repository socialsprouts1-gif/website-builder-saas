'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { setUserFeatureAction } from '@/app/admin/features/actions';
import { FEATURE_LIST, FEATURE_BY_KEY, type FeatureKey } from '@/lib/features';

interface Existing {
  id: string;
  email: string;
  flags: Partial<Record<FeatureKey, boolean>>;
}

/**
 * Overrides for one account.
 *
 * Deliberately a search-by-email rather than a switch grid against every user:
 * thirteen features times every account is a screen nobody can read, and the
 * reason to open this is almost always one named person — "let this customer
 * into 3D Studio".
 */
export function UserOverrides({
  users,
  existing,
}: {
  users: { id: string; email: string }[];
  existing: Existing[];
}) {
  const [email, setEmail] = useState('');
  const [key, setKey] = useState<FeatureKey>(FEATURE_LIST[0].key);
  const [rows, setRows] = useState<Existing[]>(existing);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function apply(enabled: boolean | null, forUser?: string, forKey?: FeatureKey) {
    setError(null);
    const target = forUser ?? users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase())?.id;
    const feature = forKey ?? key;

    if (!target) {
      setError('No account with that email address.');
      return;
    }

    start(async () => {
      const result = await setUserFeatureAction(target, feature, enabled);
      if (!result.ok) {
        setError(result.error ?? 'That did not save.');
        return;
      }
      // Reflected here rather than reloaded, so flipping several in a row is
      // not a page load each time.
      setRows((current) => {
        const user = users.find((entry) => entry.id === target)!;
        const without = current.filter((entry) => entry.id !== target);
        const found = current.find((entry) => entry.id === target);
        const flags = { ...(found?.flags ?? {}) };
        if (enabled === null) delete flags[feature];
        else flags[feature] = enabled;
        return Object.keys(flags).length === 0
          ? without
          : [...without, { id: target, email: user.email, flags }];
      });
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-2 rounded-card border border-hairline bg-raised p-4">
        <label className="min-w-[14rem] flex-1">
          <span className="mb-1 block text-[13.5px] text-ink-muted">Account</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            list="admin-user-emails"
            placeholder="someone@example.com"
            className="w-full rounded-[10px] border border-hairline bg-[var(--bg-base-deep)] px-3 py-2 text-[15px] text-ink-primary outline-none focus-visible:border-accent/45"
          />
          <datalist id="admin-user-emails">
            {users.map((user) => (
              <option key={user.id} value={user.email} />
            ))}
          </datalist>
        </label>

        <label className="min-w-[12rem]">
          <span className="mb-1 block text-[13.5px] text-ink-muted">Feature</span>
          <select
            value={key}
            onChange={(event) => setKey(event.target.value as FeatureKey)}
            className="w-full rounded-[10px] border border-hairline bg-[var(--bg-base-deep)] px-3 py-2 text-[15px] text-ink-primary outline-none focus-visible:border-accent/45"
          >
            {FEATURE_LIST.map((feature) => (
              <option key={feature.key} value={feature.key}>
                {feature.label}
              </option>
            ))}
          </select>
        </label>

        <Button size="sm" onClick={() => apply(true)} disabled={pending}>
          Turn on
        </Button>
        <Button size="sm" variant="secondary" onClick={() => apply(false)} disabled={pending}>
          Turn off
        </Button>
      </div>

      {error ? (
        <p className="mt-3 rounded-card border border-[#e5735a]/35 bg-[#e5735a]/10 px-4 py-3 text-[14.5px] text-[#e5735a]">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[15px] text-ink-muted">
          No overrides. Every account follows the switches above.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-card border border-hairline bg-raised px-4 py-3">
              <p className="text-[15px] text-ink-primary">{row.email}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {Object.entries(row.flags).map(([feature, enabled]) => (
                  <li key={feature}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => apply(null, row.id, feature as FeatureKey)}
                      title="Clear this override"
                      className="rounded-pill border border-hairline px-3 py-1 text-[13.5px] text-ink-secondary transition hover:border-accent/45 hover:text-ink-primary disabled:opacity-60"
                    >
                      {FEATURE_BY_KEY[feature as FeatureKey].label}: {enabled ? 'on' : 'off'} ✕
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

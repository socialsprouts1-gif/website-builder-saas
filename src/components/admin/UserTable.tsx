'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';
import {
  endTrialAction,
  grantTrialAction,
  toggleAdminAction,
  type ActionResult,
} from '@/app/admin/users/actions';
import type { AdminUserRow } from '@/lib/admin';

export function UserTable({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = query.trim()
    ? users.filter((user) => user.email.toLowerCase().includes(query.trim().toLowerCase()))
    : users;

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      setNotice(result);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter by email…"
        className="max-w-sm"
      />

      {notice ? (
        <p
          className={cn(
            'rounded-[10px] border px-4 py-2.5 text-[13px]',
            notice.ok
              ? 'border-accent/30 bg-accent-soft text-accent'
              : 'border-[#e5735a]/30 bg-[#e5735a]/10 text-[#e5735a]',
          )}
        >
          {notice.message}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline px-4 py-10 text-center text-[13px] text-ink-muted">
          {users.length === 0 ? 'No accounts yet.' : 'No account matches that.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-hairline">
          {visible.map((user) => {
            const open = expanded === user.id;
            return (
              <div key={user.id} className="border-b border-hairline last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : user.id)}
                  className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-ink-primary">{user.email}</span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-muted">
                      {user.projectCount} site{user.projectCount === 1 ? '' : 's'} ·{' '}
                      {user.hasOwnKey
                        ? 'own key'
                        : `${user.creditsUsedToday}/${user.creditsLimit} credits today`}{' '}
                      · joined {new Date(user.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </span>

                  {user.isAdmin ? (
                    <Badge tone="accent" className="shrink-0 px-2 py-0.5 text-[10px]">
                      Admin
                    </Badge>
                  ) : null}
                  <PlanBadge plan={user.plan} />
                  <span className="text-ink-muted" aria-hidden>
                    {open ? '−' : '+'}
                  </span>
                </button>

                {open ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-hairline bg-raised px-4 py-3">
                    <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => grantTrialAction(user.id, 1))}>
                      +1 day
                    </Button>
                    <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => grantTrialAction(user.id, 7))}>
                      +7 days
                    </Button>
                    <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => grantTrialAction(user.id, 30))}>
                      +30 days
                    </Button>

                    <span className="mx-1 h-4 w-px bg-hairline" aria-hidden />

                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending || user.id === currentUserId}
                      onClick={() => run(() => toggleAdminAction(user.id, !user.isAdmin))}
                    >
                      {user.isAdmin ? 'Remove admin' : 'Make admin'}
                    </Button>

                    <Button
                      size="sm"
                      variant="danger"
                      disabled={pending || user.id === currentUserId}
                      onClick={() => run(() => endTrialAction(user.id))}
                    >
                      End access
                    </Button>

                    {user.id === currentUserId ? (
                      <span className="text-[11.5px] text-ink-muted">
                        This is you — self-changes are blocked.
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlanBadge({ plan }: { plan: AdminUserRow['plan'] }) {
  if (!plan) {
    return (
      <Badge className="shrink-0 px-2 py-0.5 text-[10px]" dot={false}>
        no plan
      </Badge>
    );
  }

  const expired = plan.periodEnd ? new Date(plan.periodEnd).getTime() < Date.now() : false;
  const label = plan.cancelledAt ? 'cancelling' : expired ? 'expired' : plan.status;
  const tone = label === 'active' ? 'accent' : label === 'trialing' ? 'neutral' : 'warning';

  return (
    <Badge tone={tone} className="shrink-0 px-2 py-0.5 text-[10px]">
      {label}
    </Badge>
  );
}

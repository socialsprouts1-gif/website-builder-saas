'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';
import {
  endTrialAction,
  grantCreditsAction,
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
            'rounded-[10px] border px-4 py-2.5 text-[15px]',
            notice.ok
              ? 'border-accent/30 bg-accent-soft text-accent'
              : 'border-[#e5735a]/30 bg-[#e5735a]/10 text-[#e5735a]',
          )}
        >
          {notice.message}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline px-4 py-10 text-center text-[15px] text-ink-muted">
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
                    <span className="block truncate text-[15.5px] text-ink-primary">{user.email}</span>
                    <span className="mt-0.5 block text-[13.5px] text-ink-muted">
                      {user.projectCount} site{user.projectCount === 1 ? '' : 's'} ·{' '}
                      {user.hasOwnKey
                        ? 'own key'
                        : `${user.creditsLeft} credits left${
                            user.creditsGranted > 0 ? ` (${user.creditsGranted} given)` : ''
                          }`}{' '}
                      · joined {new Date(user.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </span>

                  {user.isAdmin ? (
                    <Badge tone="accent" className="shrink-0 px-2 py-0.5 text-[12px]">
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

                    {/* Credits by hand. The amounts are the ones actually
                        wanted: a couple of sites to try it, ten to run a pilot.
                        Anything else goes in the box. */}
                    {[10, 50].map((amount) => (
                      <Button
                        key={amount}
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => run(() => grantCreditsAction(user.id, amount))}
                      >
                        +{amount} credits
                      </Button>
                    ))}
                    <CustomGrant userId={user.id} pending={pending} run={run} />

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
                      <span className="text-[13.5px] text-ink-muted">
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

/**
 * Any other number, with a reason beside it.
 *
 * The reason is optional and worth asking for anyway: a grant with no note is
 * a number nobody can explain six months later, including the person who made
 * it.
 */
function CustomGrant({
  userId,
  pending,
  run,
}: {
  userId: string;
  pending: boolean;
  run: (action: () => Promise<ActionResult>) => void;
}) {
  const [credits, setCredits] = useState('');
  const [reason, setReason] = useState('');

  const amount = Number.parseInt(credits, 10);
  const valid = Number.isInteger(amount) && amount !== 0;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Input
        value={credits}
        onChange={(event) => setCredits(event.target.value)}
        placeholder="±n"
        aria-label="Credits to add"
        className="h-8 w-20 text-[14.5px]"
      />
      <Input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Why (optional)"
        aria-label="Reason for the grant"
        className="h-8 w-40 text-[14.5px]"
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={pending || !valid}
        onClick={() => {
          run(() => grantCreditsAction(userId, amount, reason));
          setCredits('');
          setReason('');
        }}
      >
        Add
      </Button>
    </span>
  );
}

function PlanBadge({ plan }: { plan: AdminUserRow['plan'] }) {
  if (!plan) {
    return (
      <Badge className="shrink-0 px-2 py-0.5 text-[12px]" dot={false}>
        no plan
      </Badge>
    );
  }

  const expired = plan.periodEnd ? new Date(plan.periodEnd).getTime() < Date.now() : false;
  const label = plan.cancelledAt ? 'cancelling' : expired ? 'expired' : plan.status;
  const tone = label === 'active' ? 'accent' : label === 'trialing' ? 'neutral' : 'warning';

  return (
    <Badge tone={tone} className="shrink-0 px-2 py-0.5 text-[12px]">
      {label}
    </Badge>
  );
}

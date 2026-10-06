'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { CREDIT_COST } from '@/lib/env';
import { REFERRAL_CREDITS, type ReferralState } from '@/lib/referrals.shared';

/**
 * The link, and what it has earned.
 *
 * A referral screen is two questions — what do I send, and did it work — and
 * anything else on it is in the way of both.
 */
export function ReferPanel({ state, origin }: { state: ReferralState; origin: string }) {
  const [copied, setCopied] = useState(false);

  if (!state.code) {
    return (
      <p className="rounded-card border border-hairline bg-raised px-4 py-3 text-[13px] text-ink-muted">
        Referrals are not switched on for this deployment yet. Run supabase/setup.sql and reload.
      </p>
    );
  }

  const link = `${origin}/signup?ref=${state.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard refused — the box below is selectable, which is the fallback
      // everybody already knows how to use.
    }
  }

  const sites = REFERRAL_CREDITS / CREDIT_COST.generation;

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-hairline bg-raised p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Your link</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Input value={link} readOnly onFocus={(event) => event.currentTarget.select()} className="flex-1 min-w-[16rem] font-mono text-[12.5px]" />
          <Button onClick={() => void copy()}>{copied ? 'Copied' : 'Copy link'}</Button>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
          Anyone who signs up through it gets {REFERRAL_CREDITS} extra credits — {sites} more websites —
          and you get the same, the moment they create their account. Up to {state.limit} friends.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Friends joined" value={String(state.joined)} />
        <Stat label="Credits earned" value={String(state.creditsEarned)} />
      </div>

      <p className="text-[12.5px] leading-relaxed text-ink-muted">
        Or just give them the code: <span className="font-mono text-ink-primary">{state.code}</span>. They
        can type it on the sign-up screen.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-hairline bg-raised px-4 py-3.5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-[24px] leading-none text-ink-primary">{value}</p>
    </div>
  );
}

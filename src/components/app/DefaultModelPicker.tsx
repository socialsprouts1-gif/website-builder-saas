'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { createClient } from '@/lib/supabase/client';
import type { ModelOption } from '@/lib/openai/models';

/**
 * Three buckets a small-business owner can reason about, not a raw model-ID
 * dropdown — with the full live list still one click away for power users.
 */
export function DefaultModelPicker({
  quality,
  fast,
  all,
  current,
  stale,
}: {
  quality: ModelOption | null;
  fast: ModelOption | null;
  all: ModelOption[];
  current: string | null;
  stale: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(current ?? quality?.id ?? '');
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in first');

      const { error: updateError } = await supabase
        .from('users')
        .update({ default_model: selected })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setNotice('Saved. New projects start on this model.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that');
    } finally {
      setBusy(false);
    }
  }

  const buckets = [quality, fast].filter(Boolean) as ModelOption[];

  return (
    <div className="space-y-5">
      {stale ? (
        <p className="rounded-[10px] border border-hairline bg-raised px-3.5 py-2.5 text-[12.5px] text-ink-muted">
          Showing Lumen&apos;s fallback list — OpenAI&apos;s live model list could not be reached. Add a working
          key above to see exactly what your account can use.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {buckets.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSelected(option.id)}
            className={cn(
              'rounded-card border px-4 py-4 text-left transition',
              selected === option.id ? 'border-accent/50 bg-accent-soft' : 'border-hairline hover:border-white/20',
            )}
          >
            <p className="text-[13px] text-ink-primary">
              {option.bucket === 'quality' ? 'Best quality' : 'Fast & cheap'}
            </p>
            <p className="mt-1 font-mono text-[11.5px] text-ink-muted">{option.id}</p>
            {option.description ? (
              <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">{option.description}</p>
            ) : null}
          </button>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="text-[12.5px] text-ink-muted transition hover:text-ink-primary"
        >
          {showAll ? '− Hide' : '+ Custom'} — pick any model your key can reach ({all.length})
        </button>
        {showAll ? (
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            size={8}
            className="mt-3 w-full rounded-[10px] border border-hairline bg-raised p-2 font-mono text-[12px] text-ink-secondary outline-none focus:border-accent/40"
          >
            {all.map((option) => (
              <option key={option.id} value={option.id}>
                {option.id}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <Button onClick={save} disabled={busy || !selected}>
        {busy ? 'Saving…' : 'Save default'}
      </Button>

      {error ? <p className="text-[13px] text-[#e5735a]">{error}</p> : null}
      {notice ? <p className="text-[13px] text-accent">{notice}</p> : null}
    </div>
  );
}

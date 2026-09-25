'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PromptBar } from '@/components/ui/PromptBar';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { HERO_CATEGORIES } from '@/lib/categories';

/** The hero's prompt bar. Hands off to /app/new; middleware handles sign-in. */
export function HeroPrompt() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  function start() {
    if (!prompt.trim()) return;
    setBusy(true);
    const params = new URLSearchParams({ prompt: prompt.trim() });
    if (category) params.set('category', category);
    router.push(`/app/new?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <PromptBar
        value={prompt}
        onChange={setPrompt}
        onSubmit={start}
        busy={busy}
        placeholder="A candlelit French bistro with online reservations…"
      />
      {/* Twelve, then the rest on request. Six was a fraction of what Lumen
          builds and the six it showed were the only ones most people ever
          found; all twenty-seven at once is a wall rather than a choice. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {(showAll ? HERO_CATEGORIES : HERO_CATEGORIES.slice(0, 12)).map((item) => (
          <CategoryChip
            key={item.slug}
            label={item.label}
            active={category === item.slug}
            onClick={() => {
              const next = category === item.slug ? null : item.slug;
              setCategory(next);
              if (next) setPrompt(item.seedPrompt);
            }}
          />
        ))}
        {HERO_CATEGORIES.length > 12 ? (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="rounded-pill border border-hairline px-3.5 py-1.5 text-[12.5px] text-ink-muted transition hover:border-white/25 hover:text-ink-primary"
          >
            {showAll ? 'Fewer' : `${HERO_CATEGORIES.length - 12} more`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

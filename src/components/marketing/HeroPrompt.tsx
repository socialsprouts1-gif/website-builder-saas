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
      <div className="flex flex-wrap items-center justify-center gap-2">
        {HERO_CATEGORIES.map((item) => (
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
      </div>
    </div>
  );
}

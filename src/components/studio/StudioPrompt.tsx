'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import { STUDIO_PROMPT_EXAMPLE, STUDIO_QUICK_PROMPTS, STUDIO_STATUS } from '@/lib/studio';

/**
 * Describe the experience you want, before the thing that builds it exists.
 *
 * This is the one place on the page where somebody could reasonably expect a
 * button to do what it says, so the status sits directly above it rather than
 * in a footnote: 3D Studio is in development, and pressing this puts the brief
 * in the queue instead of rendering a scene.
 *
 * The brief is kept because it is worth more than a mailing list. "Create a
 * futuristic site for a sneaker brand with a model you can rotate" is a product
 * requirement written by the person who would pay for it.
 */
export function StudioPrompt({ category }: { category?: string }) {
  const [brief, setBrief] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  const ready = brief.trim().length >= 10;

  async function submit() {
    if (!ready || state === 'sending') return;
    setState('sending');
    setError(null);
    try {
      const response = await fetch('/api/studio/interest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brief: brief.trim(),
          category: category ?? null,
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'That did not save. Try again in a moment.');
      }
      setState('saved');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not save.');
      setState('idle');
    }
  }

  if (state === 'saved') {
    return (
      <section className="mx-auto max-w-shell px-6 py-16">
        <div className="mx-auto max-w-2xl rounded-card border border-accent/35 bg-accent-soft/30 p-8 text-center">
          <Badge tone="accent" className="mb-4">On the list</Badge>
          <p className="font-display text-[30px] leading-tight text-ink-primary">
            Your brief is first in the queue
          </p>
          <p className="mx-auto mt-3 max-w-md text-[15.5px] leading-relaxed text-ink-secondary">
            3D Studio opens to Premium accounts first. When it does, this is the brief it starts from —
            and we will email you the day it is ready.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-shell px-6 py-16">
      <div className="mx-auto max-w-3xl rounded-card border border-hairline bg-raised p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-[26px] leading-tight text-ink-primary">
            Describe the experience you want to build
          </p>
          <Badge tone="accent">{STUDIO_STATUS}</Badge>
        </div>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-secondary">
          Studio is still being built, so this does not render a scene today. It puts your brief at the
          front of the queue for when it opens — and tells us what to build first.
        </p>

        <textarea
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          rows={4}
          placeholder={STUDIO_PROMPT_EXAMPLE}
          aria-label="Describe the experience you want to build"
          className={cn(
            'mt-5 w-full resize-y rounded-[12px] border border-hairline bg-[var(--bg-base-deep)] px-4 py-3.5',
            'text-[15.5px] leading-relaxed text-ink-primary outline-none',
            'placeholder:text-ink-muted focus-visible:border-accent/45',
          )}
        />

        <ul className="mt-3 flex flex-wrap gap-2">
          {STUDIO_QUICK_PROMPTS.map((quick) => (
            <li key={quick}>
              <button
                type="button"
                onClick={() => setBrief((current) => (current ? `${current.trim()} ${quick}` : quick))}
                className="rounded-pill border border-hairline px-3.5 py-1.5 text-[14px] text-ink-secondary transition hover:border-accent/45 hover:text-ink-primary"
              >
                + {quick}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Email, to be told when it opens"
            aria-label="Your email address"
            className={cn(
              'min-w-[14rem] flex-1 rounded-pill border border-hairline bg-[var(--bg-base-deep)] px-4 py-2.5',
              'text-[15px] text-ink-primary outline-none placeholder:text-ink-muted focus-visible:border-accent/45',
            )}
          />
          <Button size="lg" onClick={() => void submit()} disabled={!ready || state === 'sending'}>
            {state === 'sending' ? 'Saving…' : 'Generate 3D Experience →'}
          </Button>
        </div>

        {error ? (
          <p className="mt-3 rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-2.5 text-[14.5px] text-[#e5735a]">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

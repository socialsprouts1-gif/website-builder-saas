'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import { Scene } from '@/components/studio/Scene';
import { postJson } from '@/components/app/UpgradeDialog';
import {
  STUDIO_KINDS,
  STUDIO_PALETTES,
  STUDIO_STATUS,
  studioBrief,
  type StudioKind,
  type StudioPalette,
} from '@/lib/studio';

/**
 * Where a 3D website actually gets built.
 *
 * Three decisions and a sentence: what kind of thing, what colour, and what the
 * business is. The kind is a blueprint id, the colour is an instruction folded
 * into the brief, and the whole lot goes to `/api/projects` — the same endpoint
 * every other site on Lumen is built through. There is no second pipeline here,
 * which is the only reason this works at all.
 *
 * Two things it is careful about.
 *
 * The wall comes last. Anyone can choose a kind, choose a palette and write
 * their whole brief; the plan is only mentioned when Build is pressed and the
 * server says 403. That is the rule everywhere in Lumen — somebody who has done
 * the work is being asked to pay for something real, not stopped at the door —
 * and `postJson` turns that refusal into the upgrade dialog without this
 * component knowing anything about plans.
 *
 * The preview is the choice. Each kind and each palette draws its own scene in
 * its own colours, so picking "hot violet" shows a violet scene rather than the
 * same lime one with a different label underneath.
 */
export function StudioPrompt({ signedIn = true }: { signedIn?: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<StudioKind>(STUDIO_KINDS[0]);
  const [palette, setPalette] = useState<StudioPalette>(STUDIO_PALETTES[0]);
  const [brief, setBrief] = useState('');
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = brief.trim().length >= 15;

  async function build() {
    if (!ready || building) return;
    if (!signedIn) {
      router.push('/signup?next=/app/studio');
      return;
    }
    setBuilding(true);
    setError(null);

    const { ok, blocked, payload } = await postJson<{
      projectId?: string;
      jobId?: string;
      error?: string;
    }>('/api/projects', {
      prompt: studioBrief({ kind, palette, brief }),
      inputMode: 'prompt',
      blueprint: kind.id,
    });

    // Out of credits, or not on Premium. The dialog is already open over the
    // top of this; everything they typed stays exactly where it is, because
    // there is nothing to go back to and nothing to retype after upgrading.
    if (blocked) {
      setBuilding(false);
      return;
    }
    if (!ok || !payload.projectId) {
      setError(payload.error ?? 'Could not start the build. Try again in a moment.');
      setBuilding(false);
      return;
    }
    router.push(`/app/project/${payload.projectId}?job=${payload.jobId}`);
  }

  return (
    <section id="build" className="mx-auto max-w-shell scroll-mt-20 px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-card border border-hairline bg-raised p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-[28px] leading-tight text-ink-primary sm:text-[32px]">
            Build a 3D website
          </p>
          <Badge tone="accent">{STUDIO_STATUS}</Badge>
        </div>
        <p className="mt-2 text-[15.5px] leading-relaxed text-ink-secondary">
          Choose what you are making, choose its colours, and describe the business. Lumen builds
          the pages, writes the words and puts a scene on them you can turn with your finger.
        </p>

        {/* 1 — what */}
        <p className="mt-7 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          1 · What are you building?
        </p>
        <ul className="mt-3 grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {STUDIO_KINDS.map((entry) => {
            const selected = entry.id === kind.id;
            return (
              <li key={entry.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setKind(entry)}
                  aria-pressed={selected}
                  className={cn(
                    'flex h-full w-full flex-col gap-2.5 rounded-card border p-3 text-left transition',
                    selected
                      ? 'border-accent/55 bg-accent-soft'
                      : 'border-hairline bg-[var(--bg-base-deep)] hover:border-white/20',
                  )}
                >
                  <Scene
                    shape={entry.shape}
                    live={selected}
                    dim={!selected}
                    tint={selected ? entry.tint : ['#8e8e84', '#3a3a34']}
                    className="h-20 w-full rounded-[8px] border border-hairline"
                  />
                  <span className="min-w-0">
                    <span className="block text-[15.5px] font-semibold text-ink-primary">
                      {entry.label}
                    </span>
                    <span className="mt-1 block text-[14px] leading-relaxed text-ink-muted">
                      {entry.blurb}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* 2 — colour */}
        <p className="mt-7 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          2 · What colours?
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {STUDIO_PALETTES.map((entry) => {
            const selected = entry.id === palette.id;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setPalette(entry)}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-2.5 rounded-pill border py-1.5 pl-1.5 pr-3.5 text-[14.5px] transition',
                    selected
                      ? 'border-accent/55 bg-accent-soft text-ink-primary'
                      : 'border-hairline text-ink-secondary hover:border-white/20 hover:text-ink-primary',
                  )}
                >
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-white/15"
                    style={{ background: `linear-gradient(135deg, ${entry.tint[0]}, ${entry.tint[1]})` }}
                    aria-hidden
                  />
                  {entry.label}
                </button>
              </li>
            );
          })}
        </ul>

        {/* 3 — the business */}
        <p className="mt-7 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          3 · Tell Lumen about it
        </p>
        <textarea
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          rows={4}
          placeholder={kind.example}
          aria-label="Describe the business and what you want built"
          className={cn(
            'mt-3 w-full resize-y rounded-[12px] border border-hairline bg-[var(--bg-base-deep)] px-4 py-3.5',
            'text-[15.5px] leading-relaxed text-ink-primary outline-none',
            'placeholder:text-ink-muted focus-visible:border-accent/45',
          )}
        />
        <button
          type="button"
          onClick={() => setBrief(kind.example)}
          className="mt-2 text-[14px] text-ink-muted underline underline-offset-4 transition hover:text-ink-primary"
        >
          Use the example
        </button>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-hairline pt-6">
          <Button size="lg" onClick={() => void build()} disabled={!ready || building}>
            {building ? 'Starting the build…' : 'Build my 3D website →'}
          </Button>
          <p className="text-[14.5px] text-ink-secondary">
            {kind.makes} You can change everything afterwards.
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-2.5 text-[14.5px] text-[#e5735a]">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

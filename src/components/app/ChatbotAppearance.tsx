'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { AVATAR_PRESETS, CHAT_THEMES } from '@/lib/chatbot-theme';
import { VOICES } from '@/lib/chatbot-voice.shared';

/**
 * How the assistant looks, how it sounds, and whose key pays for it.
 *
 * Separate from the setup wizard on purpose. The wizard asks the four
 * questions needed to get an assistant onto a site at all; this is where
 * somebody comes back afterwards to make it theirs — and it is the screen that
 * was missing when the complaint was that the chatbot "is very normal".
 */

export interface AppearanceState {
  theme: string;
  avatarPreset: string | null;
  avatarUrl: string | null;
  voiceEnabled: boolean;
  voiceId: string;
  ownKeyHint: string | null;
  repliesUsed: number;
  freeReplies: number;
  indexedAt: string | null;
  chunkCount: number;
}

export function ChatbotAppearance({
  projectId,
  accent,
  initial,
  config,
}: {
  projectId: string;
  /** The site's own accent, so the previews are what the visitor will see. */
  accent: string;
  initial: AppearanceState;
  /** The fields the save endpoint needs alongside these. */
  config: { name: string; greeting: string; tone: string; faq: string; isActive: boolean };
}) {
  const [state, setState] = useState(initial);
  const [ownKey, setOwnKey] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  function save(patch: Partial<AppearanceState>, key?: string | null) {
    const next = { ...state, ...patch };
    setState(next);
    setError(null);

    start(async () => {
      const response = await fetch(`/api/projects/${projectId}/chatbot`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...config,
          theme: next.theme,
          avatarPreset: next.avatarPreset ?? undefined,
          avatarUrl: next.avatarUrl,
          voiceEnabled: next.voiceEnabled,
          voiceId: next.voiceId,
          ...(key !== undefined ? { ownKey: key } : {}),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setState(state);
        setError(payload.error ?? 'That did not save.');
        return;
      }
      setStatus('Saved');
      window.setTimeout(() => setStatus(null), 2200);
    });
  }

  async function upload(chosen: File) {
    setError(null);
    const form = new FormData();
    form.append('file', chosen);
    const response = await fetch(`/api/projects/${projectId}/assets`, { method: 'POST', body: form });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) {
      setError(payload.error ?? 'That image did not upload.');
      return;
    }
    // An uploaded picture wins over a preset, so the two cannot both apply.
    save({ avatarUrl: payload.url, avatarPreset: null });
  }

  const used = state.repliesUsed;
  const left = Math.max(0, state.freeReplies - used);

  return (
    <div className="space-y-10">
      {error ? (
        <p className="rounded-card border border-[#e5735a]/35 bg-[#e5735a]/10 px-4 py-3 text-[14.5px] text-[#e5735a]">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-[14px] text-accent">{status}</p> : null}

      {/* ---- what it knows --------------------------------------------- */}
      <section>
        <Heading
          title="What it knows"
          blurb="Built from your pages automatically every time Lumen writes the site. Nothing to press."
        />
        <div className="rounded-card border border-hairline bg-raised px-4 py-3.5 text-[15px]">
          {state.indexedAt ? (
            <p className="text-ink-secondary">
              <span className="text-ink-primary">{state.chunkCount} passages</span> from your site,
              last read {new Date(state.indexedAt).toLocaleString('en-IN')}.
            </p>
          ) : (
            <p className="text-ink-muted">
              Not read yet. It is done at the end of a build — rebuild or press Save and reindex below.
            </p>
          )}
        </div>
      </section>

      {/* ---- the look -------------------------------------------------- */}
      <section>
        <Heading title="The look" blurb="Each one takes your site's own accent colour." />
        <ul className="grid gap-3 sm:grid-cols-3">
          {CHAT_THEMES.map((theme) => {
            const on = theme.id === state.theme;
            return (
              <li key={theme.id}>
                <button
                  type="button"
                  onClick={() => save({ theme: theme.id })}
                  aria-pressed={on}
                  disabled={pending}
                  className={cn(
                    'w-full overflow-hidden rounded-card border text-left transition disabled:opacity-60',
                    on ? 'border-accent/60 ring-1 ring-accent/40' : 'border-hairline hover:border-white/25',
                  )}
                >
                  {/* A real miniature of the panel, not a colour swatch. */}
                  <span
                    className="block h-[86px] p-2.5"
                    style={{ background: theme.panel, color: theme.ink, fontFamily: theme.font }}
                  >
                    <span
                      className="mb-1.5 block h-3 w-full rounded"
                      style={{ background: theme.solidHeader ? accent : theme.botBubble }}
                    />
                    <span
                      className="mb-1 block h-3.5 w-3/4 rounded"
                      style={{ background: theme.botBubble }}
                    />
                    <span className="ml-auto block h-3.5 w-1/2 rounded" style={{ background: accent }} />
                  </span>
                  <span className="block border-t border-hairline px-3 py-2">
                    <span className="block text-[14.5px] text-ink-primary">{theme.label}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{theme.note}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- the face -------------------------------------------------- */}
      <section>
        <Heading title="Its face" blurb="A ready-made one, or upload your own logo." />
        <ul className="flex flex-wrap gap-2.5">
          {AVATAR_PRESETS.map((preset) => {
            const on = !state.avatarUrl && state.avatarPreset === preset.id;
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => save({ avatarPreset: preset.id, avatarUrl: null })}
                  aria-label={preset.label}
                  aria-pressed={on}
                  disabled={pending}
                  title={preset.label}
                  className={cn(
                    'grid h-14 w-14 place-items-center rounded-card border transition disabled:opacity-60',
                    on ? 'border-accent/60 bg-accent-soft' : 'border-hairline hover:border-white/25',
                  )}
                  style={{ color: accent }}
                >
                  {preset.svg ? (
                    <span className="block h-7 w-7" dangerouslySetInnerHTML={{ __html: preset.svg }} />
                  ) : (
                    <span className="text-[12px] text-ink-muted">None</span>
                  )}
                </button>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              onClick={() => file.current?.click()}
              disabled={pending}
              className={cn(
                'grid h-14 w-14 place-items-center overflow-hidden rounded-card border transition disabled:opacity-60',
                state.avatarUrl ? 'border-accent/60' : 'border-dashed border-hairline hover:border-white/25',
              )}
              title="Upload a picture"
            >
              {state.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={state.avatarUrl} alt="Your logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[20px] text-ink-muted">+</span>
              )}
            </button>
            <input
              ref={file}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                if (chosen) void upload(chosen);
                event.target.value = '';
              }}
            />
          </li>
        </ul>
      </section>

      {/* ---- voice ----------------------------------------------------- */}
      <section>
        <Heading
          title="Talking to it"
          blurb="A microphone in the bubble, so a visitor can speak instead of typing. Your own key only."
        />
        <div className="rounded-card border border-hairline bg-raised p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={state.voiceEnabled}
              disabled={pending}
              onChange={(event) => save({ voiceEnabled: event.target.checked })}
              className="mt-1 h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-[15.5px] text-ink-primary">Let visitors talk to it</span>
              <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-muted">
                A spoken conversation is open-ended, so there is no free allowance for it — it runs on
                the key below and nothing else. Add one before switching this on.
              </span>
            </span>
          </label>

          {state.voiceEnabled ? (
            <div className="mt-4 border-t border-hairline pt-4">
              <p className="mb-2 text-[14px] text-ink-secondary">Which voice</p>
              <ul className="flex flex-wrap gap-2">
                {VOICES.map((voice) => (
                  <li key={voice.id}>
                    <button
                      type="button"
                      onClick={() => save({ voiceId: voice.id })}
                      aria-pressed={state.voiceId === voice.id}
                      disabled={pending}
                      title={voice.note}
                      className={cn(
                        'rounded-pill border px-3.5 py-1.5 text-[14.5px] transition disabled:opacity-60',
                        state.voiceId === voice.id
                          ? 'border-accent/55 bg-accent-soft text-ink-primary'
                          : 'border-hairline text-ink-secondary hover:border-white/25 hover:text-ink-primary',
                      )}
                    >
                      {voice.label}
                    </button>
                  </li>
                ))}
              </ul>
              {!state.ownKeyHint ? (
                <p className="mt-3 rounded-[10px] border border-[#e5a05a]/35 bg-[#e5a05a]/10 px-3.5 py-2.5 text-[14px] text-[#e5a05a]">
                  No key yet, so the microphone will not start. Add one below.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* ---- who pays -------------------------------------------------- */}
      <section>
        <Heading
          title="Who pays for the replies"
          blurb="Separate from your build credits — your assistant keeps answering customers even when you have stopped building."
        />
        <div className="rounded-card border border-hairline bg-raised p-4">
          {state.ownKeyHint ? (
            <p className="text-[15px] text-ink-secondary">
              Running on your own key, ending{' '}
              <span className="font-mono text-ink-primary">{state.ownKeyHint}</span>. No limit from Lumen.
            </p>
          ) : (
            <>
              <div className="flex items-end justify-between gap-3">
                <p className="text-[15px] text-ink-secondary">
                  <span className="text-ink-primary">{left}</span> of {state.freeReplies} free replies left
                  this month
                </p>
                <p className="text-[13.5px] text-ink-muted">{used} used</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-pill bg-[var(--bg-base-deep)]">
                <div
                  className="h-full rounded-pill bg-accent transition-[width]"
                  style={{ width: `${Math.min(100, (used / Math.max(state.freeReplies, 1)) * 100)}%` }}
                />
              </div>
            </>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-hairline pt-4">
            <label className="min-w-[16rem] flex-1">
              <span className="mb-1 block text-[13.5px] text-ink-muted">
                {state.ownKeyHint ? 'Replace the key' : 'Your OpenAI key'}
              </span>
              <input
                value={ownKey}
                onChange={(event) => setOwnKey(event.target.value)}
                type="password"
                autoComplete="off"
                placeholder="sk-…"
                className="w-full rounded-[10px] border border-hairline bg-[var(--bg-base-deep)] px-3 py-2 font-mono text-[14px] text-ink-primary outline-none focus-visible:border-accent/45"
              />
            </label>
            <Button
              size="sm"
              disabled={pending || ownKey.trim().length < 20}
              onClick={() => {
                save({ ownKeyHint: ownKey.trim().slice(-4) }, ownKey.trim());
                setOwnKey('');
              }}
            >
              Save key
            </Button>
            {state.ownKeyHint ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => save({ ownKeyHint: null, voiceEnabled: false }, null)}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
            Encrypted before it is stored and never shown again — only the last four characters.
          </p>
        </div>
      </section>
    </div>
  );
}

function Heading({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-[22px] leading-tight text-ink-primary">{title}</h2>
      <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-ink-secondary">{blurb}</p>
    </div>
  );
}

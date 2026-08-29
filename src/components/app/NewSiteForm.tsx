'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PromptBar } from '@/components/ui/PromptBar';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { Button } from '@/components/ui/Button';
import { CATEGORIES, categoryBySlug } from '@/lib/categories';
import { cn } from '@/components/ui/cn';
import type { ModelOption } from '@/lib/openai/models';

type Mode = 'describe' | 'screenshot' | 'speak';

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'describe', label: 'Describe it', hint: 'One sentence about the business is enough.' },
  { id: 'screenshot', label: 'Upload a screenshot', hint: 'A site you like, a Figma export, even a sketch on paper.' },
  { id: 'speak', label: 'Speak it', hint: 'Hold the mic and talk. Lumen transcribes as you go.' },
];

const MAX_SCREENSHOT_BYTES = 6 * 1024 * 1024;

export function NewSiteForm({
  models,
  defaultModel,
  defaultCategory,
}: {
  models: { quality: ModelOption | null; fast: ModelOption | null; all: ModelOption[] };
  defaultModel: string | null;
  defaultCategory: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>('describe');
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<string | null>(defaultCategory);
  const [screenshot, setScreenshot] = useState<{ dataUrl: string; name: string } | null>(null);
  const [model, setModel] = useState<string>(defaultModel ?? models.quality?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed from the marketing hero / onboarding hand-off.
  useEffect(() => {
    const seededPrompt = searchParams.get('prompt');
    const seededCategory = searchParams.get('category');
    if (seededPrompt) setPrompt(seededPrompt);
    if (seededCategory) {
      setCategory(seededCategory);
      if (!seededPrompt) setPrompt(categoryBySlug(seededCategory)?.seedPrompt ?? '');
    }
  }, [searchParams]);

  async function readFile(file: File) {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('That is not an image. PNG, JPG or WebP please.');
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setError('That image is over 6MB. Try a smaller export.');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read that file'));
      reader.readAsDataURL(file);
    });
    setScreenshot({ dataUrl, name: file.name });
  }

  async function submit() {
    if (mode === 'screenshot' && !screenshot) {
      setError('Add a screenshot first.');
      return;
    }
    if (mode !== 'screenshot' && !prompt.trim()) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim() || 'Build a site based on this screenshot.',
          category,
          model: model || null,
          inputMode: mode === 'screenshot' ? 'screenshot' : mode === 'speak' ? 'voice' : 'prompt',
          screenshotDataUrl: mode === 'screenshot' ? screenshot?.dataUrl : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not start generation');
      router.push(`/app/project/${payload.projectId}?job=${payload.jobId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start generation');
      setBusy(false);
    }
  }

  const activeMode = MODES.find((item) => item.id === mode)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-pill border border-hairline p-1">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-pill px-4 py-2 text-[13px] transition',
              mode === item.id ? 'bg-accent text-accent-ink' : 'text-ink-secondary hover:text-ink-primary',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="text-center text-[13px] text-ink-muted">{activeMode.hint}</p>

      {mode === 'screenshot' ? (
        <div className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void readFile(file);
            }}
            className={cn(
              'rounded-card border border-dashed p-8 text-center transition',
              dragging ? 'border-accent bg-accent-soft' : 'border-hairline bg-raised/50',
            )}
          >
            {screenshot ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshot.dataUrl}
                  alt="Uploaded reference screenshot"
                  className="mx-auto max-h-56 rounded-[10px] border border-hairline"
                />
                <p className="text-[12px] text-ink-muted">{screenshot.name}</p>
                <Button variant="ghost" size="sm" onClick={() => setScreenshot(null)}>
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink-secondary">Drop an image here</p>
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Choose a file
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </div>

          <p className="rounded-[10px] border border-hairline bg-raised px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
            Lumen builds a new, original site inspired by the visual structure of your upload. It does not
            copy or redistribute another business&apos;s content, images or branding — no logo, business name
            or verbatim copy is carried over.
          </p>
        </div>
      ) : null}

      <PromptBar
        value={prompt}
        onChange={setPrompt}
        onSubmit={submit}
        busy={busy}
        autoFocus={mode === 'describe'}
        allowVoice
        placeholder={
          mode === 'screenshot'
            ? 'Optional: “build this but for my dental clinic, keep the layout, change the content”'
            : mode === 'speak'
              ? 'Tap the mic and describe your business out loud…'
              : 'A candlelit French bistro with online reservations…'
        }
        submitLabel="Generate"
      />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.slice(0, 6).map((item) => (
          <CategoryChip
            key={item.slug}
            label={item.label}
            active={category === item.slug}
            onClick={() => {
              const next = category === item.slug ? null : item.slug;
              setCategory(next);
              if (next && !prompt.trim()) setPrompt(item.seedPrompt);
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-[12.5px] text-ink-muted">
        <label className="flex items-center gap-2">
          <span>Model</span>
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="rounded-pill border border-hairline bg-raised px-3 py-1.5 text-[12.5px] text-ink-secondary outline-none focus:border-accent/40"
          >
            {models.quality ? <option value={models.quality.id}>Best quality — {models.quality.label}</option> : null}
            {models.fast ? <option value={models.fast.id}>Fast &amp; cheap — {models.fast.label}</option> : null}
            <optgroup label="All models">
              {models.all.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.id}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-center text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

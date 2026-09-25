'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { InterviewStep } from '@/components/app/InterviewStep';
import { MediaDrop } from '@/components/app/MediaDrop';
import { useUploads } from '@/components/app/useUploads';
import { cn } from '@/components/ui/cn';
import type { Answer, InterviewQuestion } from '@/lib/generation/interview';

export interface SetupTemplate {
  id: string;
  name: string;
  industryLabel: string;
  businessTypes: string[];
  action: string;
  sections: number;
  pages: number;
}

/**
 * The questions Lumen asks once a template has been chosen — one at a time.
 *
 * What this replaced was a page of fourteen labelled boxes: name, type, town,
 * description, offerings, audience, phone, WhatsApp, email, address, hours,
 * socials, a hex colour, a call to action. It asked a dentist and a grocer the
 * same things in the same order and it asked all of them at once, which is the
 * one form design guaranteed to be abandoned on a phone.
 *
 * So it works the way the prompt screen already did. They say what the business
 * is, in a line; the model reads that line and the template's own pages and
 * writes the questions it actually needs — the prices for a prices band, the
 * names for a team band, the questions for an FAQ; and they answer them one
 * screen at a time, skipping any of them.
 */
export function TemplateInterview({ template }: { template: SetupTemplate }) {
  const router = useRouter();
  const uploads = useUploads();

  const [prompt, setPrompt] = useState('');
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enough to be a sentence about a business rather than a stray keystroke.
  const ready = prompt.trim().length >= 8;

  /**
   * Ask what to ask. A template narrows this a long way — nothing about the
   * design is still open — so the questions come back about this trade and
   * this template's sections.
   *
   * If they cannot be written at all — no key, a bad reply, the network — the
   * build goes ahead on the line they typed, because the interview exists to
   * improve a generation rather than to gate one.
   */
  async function askFirst() {
    if (!ready || asking || busy) return;
    setAsking(true);
    setError(null);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), blueprint: template.id }),
      });
      const payload = await response.json();
      if (response.ok && Array.isArray(payload.questions) && payload.questions.length > 0) {
        setQuestions(payload.questions);
        return;
      }
      await create([]);
    } catch {
      await create([]);
    } finally {
      setAsking(false);
    }
  }

  async function create(answers: Answer[]) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          blueprint: template.id,
          inputMode: 'template',
          answers,
          assets: uploads.assets,
        }),
      });
      const payload = (await response.json()) as { projectId?: string; jobId?: string; error?: string };
      if (!response.ok || !payload.projectId) {
        throw new Error(payload.error ?? 'Could not start the build. Try again.');
      }
      router.push(`/app/project/${payload.projectId}?job=${payload.jobId ?? ''}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the build. Try again.');
      setBusy(false);
      setQuestions(null);
    }
  }

  const problem = error ? (
    <p className="rounded-card border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[13px] text-[#e5735a]">
      {error}
    </p>
  ) : null;

  if (questions) {
    return (
      <div className="space-y-5">
        <p className="rounded-[10px] border border-hairline bg-raised px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted">
          <span className="text-ink-secondary">{template.name}, for:</span> {prompt.trim()}
        </p>
        <InterviewStep
          questions={questions}
          busy={busy}
          onDone={(answers) => void create(answers)}
          onSkipAll={() => void create([])}
          media={
            <MediaDrop
              attachments={uploads.attachments}
              onAttachFiles={uploads.attachFiles}
              onRemove={uploads.remove}
            />
          }
        />
        {problem}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-1 w-6 rounded-pill bg-accent" />
          <span className="h-1 w-3 rounded-pill bg-white/25" />
          <span className="h-1 w-3 rounded-pill bg-white/25" />
        </div>
        <p className="text-[11.5px] text-ink-muted">First question</p>
      </div>

      <div>
        <h2 className="font-display text-[24px] leading-tight text-ink-primary">
          What is the business, and where is it?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          A line or two in your own words. Lumen reads it, then asks only what it still needs — a few
          questions, one at a time, and you can skip any of them.
        </p>
      </div>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends it. A sentence is not a paragraph, and the button being
          // the only way forward is what makes a phone keyboard feel stuck.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void askFirst();
          }
        }}
        rows={4}
        autoFocus
        placeholder={placeholderFor(template)}
        aria-label="What the business is, and where"
        className={cn(
          'w-full resize-y rounded-[10px] border border-hairline bg-[var(--bg-base-deep)] px-3.5 py-3 text-[14px]',
          'leading-relaxed text-ink-primary outline-none placeholder:text-ink-muted focus-visible:border-white/30',
        )}
      />

      {problem}

      <div className="flex flex-wrap items-center gap-4 border-t border-hairline pt-5">
        <Button size="lg" onClick={() => void askFirst()} disabled={!ready || asking || busy}>
          {asking ? 'Reading it…' : busy ? 'Starting…' : 'Continue'}
        </Button>
        <p className="text-[12.5px] text-ink-muted">
          {template.sections} sections across {template.pages} pages, built around{' '}
          {template.action.toLowerCase()}.
        </p>
      </div>
    </div>
  );
}

/**
 * An example in the reader's own trade.
 *
 * The placeholder is the only instruction anybody reads on a screen like this,
 * so it shows the three things the answer needs — a name, a town and one fact
 * worth printing — in the words of the business that chose this template.
 */
function placeholderFor(template: SetupTemplate): string {
  const type = (template.businessTypes[0] ?? template.industryLabel).toLowerCase();
  return `Your business name — ${type} in your town, and the one thing you are known for`;
}

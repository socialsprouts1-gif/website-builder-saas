'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Field';
import { StepShell } from '@/components/app/StepShell';
import { cn } from '@/components/ui/cn';
import type { Answer, InterviewQuestion } from '@/lib/generation/interview';

/**
 * One question per screen, in the order Lumen wants to ask them.
 *
 * Everything here is skippable, at any point, and it says so on a button
 * rather than in a sentence. A person who already knows what they want should
 * not be made to click through nine screens to get it, and an unanswered
 * question is better than a guessed one — a skipped question simply never
 * reaches the brief.
 */
export function InterviewStep({
  questions,
  onDone,
  onSkipAll,
  busy,
  media,
}: {
  questions: InterviewQuestion[];
  onDone: (answers: Answer[]) => void;
  onSkipAll: () => void;
  busy: boolean;
  /**
   * An upload control, asked for as the last question.
   *
   * A logo and a few real photographs change a generated site more than any
   * answer here does, and the moment to ask is while someone is already
   * answering questions — not after they have seen stock imagery in their own
   * shop's website. Optional like everything else: the step can be skipped.
   */
  media?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});

  // Before anything derives from the list. The caller only renders this with
  // questions to ask, and this is what keeps that assumption from becoming an
  // index off the end of the array if that ever stops being true.
  if (questions.length === 0) return null;

  const steps = questions.length + (media ? 1 : 0);
  const onMedia = Boolean(media) && index === questions.length;
  // On the media step there is no question; everything below reads from this
  // one, so it falls back to the last real one rather than going undefined.
  const question = questions[Math.min(index, questions.length - 1)];
  const last = index === steps - 1;
  const chosen = picked[question.id] ?? [];
  const typed = other[question.id] ?? '';

  function toggle(label: string) {
    setPicked((current) => {
      const existing = current[question.id] ?? [];
      if (question.kind === 'multi') {
        return {
          ...current,
          [question.id]: existing.includes(label)
            ? existing.filter((item) => item !== label)
            : [...existing, label],
        };
      }
      return { ...current, [question.id]: existing[0] === label ? [] : [label] };
    });
  }

  function collect(): Answer[] {
    return questions
      .map((item) => {
        const parts = [...(picked[item.id] ?? [])];
        const free = (other[item.id] ?? '').trim();
        if (free) parts.push(free);
        return { question: item.question, answer: parts.join(', ') };
      })
      .filter((answer) => answer.answer.length > 0);
  }

  function advance() {
    if (last) onDone(collect());
    else setIndex((current) => current + 1);
  }

  /** Leave this one out entirely, rather than carrying a half-answer forward. */
  function skip() {
    if (!onMedia) {
      setPicked((current) => ({ ...current, [question.id]: [] }));
      setOther((current) => ({ ...current, [question.id]: '' }));
    }
    advance();
  }

  return (
    <StepShell
      index={index}
      total={steps}
      title={onMedia ? 'Do you have a logo or photos?' : question.question}
      help={
        onMedia
          ? 'Optional, and you can add them later. If you put them in now, Lumen builds the site around your own pictures instead of stand-ins.'
          : question.help
      }
      busy={busy}
      onBack={index > 0 ? () => setIndex((current) => current - 1) : undefined}
      onNext={advance}
      nextLabel={busy ? 'Starting…' : last ? 'Build it' : 'Continue'}
      onSkip={skip}
      skipLabel={last ? 'Skip this' : 'Skip this question'}
      onSkipAll={onSkipAll}
      skipAllLabel="Skip the questions and build"
    >
      {!onMedia && question.kind === 'multi' ? (
        <p className="-mt-3 text-[13.5px] text-ink-muted">Pick as many as apply.</p>
      ) : null}

      {onMedia ? <div>{media}</div> : null}

      {!onMedia && question.options.length > 0 ? (
        <div className="space-y-2">
          {question.options.map((option) => {
            const active = chosen.includes(option.label);
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => toggle(option.label)}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-start gap-3 rounded-card border px-4 py-3 text-left transition',
                  active
                    ? 'border-accent/50 bg-accent-soft'
                    : 'border-hairline bg-raised hover:border-white/15',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[11px] font-bold',
                    question.kind === 'multi' ? 'rounded-[4px]' : 'rounded-pill',
                    active ? 'border-accent bg-accent text-accent-ink' : 'border-white/25',
                  )}
                >
                  {active ? '✓' : ''}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15.5px] text-ink-primary">{option.label}</span>
                  {option.hint ? (
                    <span className="mt-0.5 block text-[14.5px] leading-relaxed text-ink-muted">
                      {option.hint}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {!onMedia && (question.kind === 'text' || question.allowOther) ? (
        <Input
          value={typed}
          onChange={(event) => setOther((current) => ({ ...current, [question.id]: event.target.value }))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') advance();
          }}
          placeholder={question.kind === 'text' ? 'Type your answer' : 'Something else…'}
          aria-label={question.question}
        />
      ) : null}
    </StepShell>
  );
}

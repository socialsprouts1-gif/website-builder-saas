'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';
import type { Answer, InterviewQuestion } from '@/lib/generation/interview';

/**
 * One question per screen, in the order Lumen wants to ask them.
 *
 * Everything here is skippable, at any point. A person who already knows what
 * they want should not be made to click through nine screens to get it, and an
 * unanswered question is better than a guessed one — a skipped question simply
 * never reaches the brief.
 */
export function InterviewStep({
  questions,
  onDone,
  onSkipAll,
  busy,
}: {
  questions: InterviewQuestion[];
  onDone: (answers: Answer[]) => void;
  onSkipAll: () => void;
  busy: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});

  const question = questions[index];
  const last = index === questions.length - 1;
  const chosen = picked[question.id] ?? [];
  const typed = other[question.id] ?? '';
  const answered = chosen.length > 0 || typed.trim().length > 0;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {questions.map((item, position) => (
            <span
              key={item.id}
              className={cn(
                'h-1 rounded-pill transition-all',
                position === index ? 'w-6 bg-accent' : position < index ? 'w-3 bg-accent/45' : 'w-3 bg-white/25',
              )}
            />
          ))}
        </div>
        <p className="text-[11.5px] text-ink-muted">
          {index + 1} of {questions.length}
        </p>
      </div>

      <div>
        <h2 className="font-display text-[24px] leading-tight text-ink-primary">{question.question}</h2>
        {question.help ? (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{question.help}</p>
        ) : null}
        {question.kind === 'multi' ? (
          <p className="mt-1.5 text-[11.5px] text-ink-muted">Pick as many as apply.</p>
        ) : null}
      </div>

      {question.options.length > 0 ? (
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
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[9px] font-bold',
                    question.kind === 'multi' ? 'rounded-[4px]' : 'rounded-pill',
                    active ? 'border-accent bg-accent text-accent-ink' : 'border-white/25',
                  )}
                >
                  {active ? '✓' : ''}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] text-ink-primary">{option.label}</span>
                  {option.hint ? (
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-muted">
                      {option.hint}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {question.kind === 'text' || question.allowOther ? (
        <Input
          value={typed}
          onChange={(event) => setOther((current) => ({ ...current, [question.id]: event.target.value }))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && answered) advance();
          }}
          placeholder={question.kind === 'text' ? 'Type your answer' : 'Something else…'}
          aria-label={question.question}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
        {index > 0 ? (
          <Button variant="ghost" onClick={() => setIndex((current) => current - 1)} disabled={busy}>
            Back
          </Button>
        ) : null}
        <Button onClick={advance} disabled={busy}>
          {busy ? 'Starting…' : last ? 'Build it' : answered ? 'Next' : 'Skip this'}
        </Button>
        <button
          type="button"
          onClick={onSkipAll}
          disabled={busy}
          className="ml-auto text-[12.5px] text-ink-muted transition hover:text-ink-primary disabled:opacity-40"
        >
          Skip the questions, just build it
        </button>
      </div>
    </div>
  );
}

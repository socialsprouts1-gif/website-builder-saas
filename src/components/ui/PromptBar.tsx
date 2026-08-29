'use client';

import { useRef, useState } from 'react';
import { cn } from './cn';
import { MicButton } from './MicButton';

export function PromptBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Describe the website you want to build…',
  submitLabel = 'Generate',
  disabled = false,
  busy = false,
  allowVoice = true,
  autoFocus = false,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  allowVoice?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  }

  function autosize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }

  return (
    <div
      className={cn(
        'flex items-end gap-3 rounded-[20px] border bg-raised px-4 py-3 transition',
        focused ? 'border-accent/35' : 'border-hairline',
        className,
      )}
    >
      <SparkleIcon />
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          onChange(event.target.value);
          autosize();
        }}
        className="max-h-[180px] min-h-[28px] flex-1 resize-none bg-transparent py-1 text-[15px] text-ink-primary outline-none placeholder:text-ink-muted"
      />
      {allowVoice ? (
        <MicButton
          onTranscript={(text) => {
            onChange(value ? `${value} ${text}` : text);
            requestAnimationFrame(autosize);
          }}
        />
      ) : null}
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || busy || !value.trim()}
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-pill bg-accent px-4 text-[13px] font-medium text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Working…' : submitLabel}
        {!busy && <span aria-hidden>→</span>}
      </button>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg className="mb-1.5 shrink-0" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2.5 11.6 7 16 8.6 11.6 10.2 10 14.7 8.4 10.2 4 8.6 8.4 7 10 2.5Z"
        fill="var(--accent)"
        opacity="0.85"
      />
      <path d="M15.5 13.2 16.3 15.2 18.3 16 16.3 16.8 15.5 18.8 14.7 16.8 12.7 16 14.7 15.2 15.5 13.2Z" fill="var(--accent)" opacity="0.45" />
    </svg>
  );
}

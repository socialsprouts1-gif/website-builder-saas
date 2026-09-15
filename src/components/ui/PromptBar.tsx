'use client';

import { useRef, useState } from 'react';
import { cn } from './cn';
import { MicButton } from './MicButton';
import { acceptFor, type AttachmentKind } from '@/lib/attachments';

/**
 * Something attached to the message: a file on its way to storage, a file that
 * got there, or a website to look at. `url` is null while it uploads, which is
 * what the chip shows as "uploading…".
 */
export interface PromptAttachment {
  id: string;
  kind: AttachmentKind;
  label: string;
  url: string | null;
  error?: string;
}

/**
 * Anything else the + menu should offer.
 *
 * Attaching a file is not the only thing someone wants from that button —
 * connecting a payment gateway, adding a page and finding help all belong in
 * the same place. They are passed in rather than built here because what is
 * on offer depends on where the prompt bar is: the new-site screen has no
 * project to connect anything to yet.
 */
export interface PromptMenuItem {
  id: string;
  icon: string;
  label: string;
  hint: string;
  href?: string;
  onSelect?: () => void;
}

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
  attachments = [],
  onAttachFiles,
  onAttachReference,
  onRemoveAttachment,
  menuExtras = [],
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
  /** Currently attached things. Chips render above the box. */
  attachments?: PromptAttachment[];
  /**
   * Supplied by whoever knows where the bytes should go. Leave it out and the
   * attach button is not rendered at all — the landing-page prompt has no
   * project to upload into yet.
   */
  onAttachFiles?: (kind: 'logo' | 'image' | 'video', files: File[]) => void;
  onAttachReference?: (url: string) => void;
  onRemoveAttachment?: (id: string) => void;
  /** Extra entries under the file ones, separated by a rule. */
  menuExtras?: PromptMenuItem[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickKind, setPickKind] = useState<'logo' | 'image' | 'video'>('image');
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [reference, setReference] = useState('');
  const canAttach = Boolean(onAttachFiles) || menuExtras.length > 0;
  // What was already typed when dictation started. Live results replace only
  // the spoken part, so a half-written sentence is not eaten by the mic.
  const spokenBaseRef = useRef<string | null>(null);

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
    // The controls sit under the box, never beside it.
    //
    // They used to move alongside at the `sm` breakpoint, which is measured
    // against the window — and the workspace composer lives in a ~450px column
    // inside a wide window. The language picker, the mic and Send took the
    // width and the textarea was left about four characters across, wrapping
    // mid-word down the side of the pane.
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[20px] border bg-raised px-4 py-3 transition',
        focused ? 'border-accent/35' : 'border-hairline',
        className,
      )}
    >
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((item) => (
            <span
              key={item.id}
              className={cn(
                'inline-flex max-w-full items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11.5px]',
                item.error
                  ? 'border-[#e5735a]/40 bg-[#e5735a]/10 text-[#e5735a]'
                  : 'border-hairline bg-base text-ink-secondary',
              )}
              title={item.error ?? item.url ?? item.label}
            >
              <span aria-hidden>{ICONS[item.kind]}</span>
              <span className="truncate">{item.label}</span>
              {!item.url && !item.error ? (
                <span className="shrink-0 text-ink-muted">uploading…</span>
              ) : null}
              {onRemoveAttachment ? (
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(item.id)}
                  aria-label={`Remove ${item.label}`}
                  className="shrink-0 text-ink-muted transition hover:text-ink-primary"
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex w-full min-w-0 items-start gap-3">
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
          className="max-h-[180px] min-h-[28px] w-full min-w-0 flex-1 resize-none bg-transparent py-1 text-[15px] text-ink-primary outline-none placeholder:text-ink-muted"
        />
      </div>

      {referenceOpen && onAttachReference ? (
        <div className="flex items-center gap-2">
          <input
            value={reference}
            autoFocus
            onChange={(event) => setReference(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setReferenceOpen(false);
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (!reference.trim()) return;
              onAttachReference(reference);
              setReference('');
              setReferenceOpen(false);
            }}
            placeholder="A site you like — example.com"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-pill border border-hairline bg-base px-3 py-1.5 text-[12.5px] text-ink-primary outline-none focus:border-accent/40"
          />
          <button
            type="button"
            onClick={() => {
              if (!reference.trim()) return;
              onAttachReference(reference);
              setReference('');
              setReferenceOpen(false);
            }}
            className="shrink-0 rounded-pill border border-hairline px-3 py-1.5 text-[12px] text-ink-secondary transition hover:text-ink-primary"
          >
            Add
          </button>
        </div>
      ) : null}

      <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
        {canAttach ? (
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              multiple={pickKind !== 'logo'}
              accept={acceptFor(pickKind)}
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length > 0) onAttachFiles?.(pickKind, files);
                // Cleared so picking the same file twice still fires a change.
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-hairline px-3 text-[12.5px] text-ink-secondary transition hover:border-accent/40 hover:text-ink-primary"
            >
              <PlusIcon />
              Add
            </button>
            {menuOpen ? (
              <>
                {/* Click anywhere else and the menu goes away. */}
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="lumen-panel absolute bottom-11 left-0 z-20 max-h-[60vh] w-60 overflow-y-auto rounded-[12px] border border-hairline bg-raised py-1">
                  {onAttachFiles ? (
                    <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                      Attach
                    </p>
                  ) : null}
                  <MenuItem
                    icon={ICONS.logo}
                    label="Logo"
                    hint="Goes in the header"
                    onClick={() => {
                      setPickKind('logo');
                      setMenuOpen(false);
                      requestAnimationFrame(() => fileInputRef.current?.click());
                    }}
                  />
                  <MenuItem
                    icon={ICONS.image}
                    label="Image"
                    hint="A photo of the business"
                    onClick={() => {
                      setPickKind('image');
                      setMenuOpen(false);
                      // The accept attribute has to be on the input before the
                      // picker opens, and React has not flushed the state yet.
                      requestAnimationFrame(() => fileInputRef.current?.click());
                    }}
                  />
                  <MenuItem
                    icon={ICONS.video}
                    label="Video"
                    hint="Plays inside the page"
                    onClick={() => {
                      setPickKind('video');
                      setMenuOpen(false);
                      requestAnimationFrame(() => fileInputRef.current?.click());
                    }}
                  />
                  {onAttachReference ? (
                    <MenuItem
                      icon={ICONS.reference}
                      label="Website reference"
                      hint="Build it to look like this"
                      onClick={() => {
                        setMenuOpen(false);
                        setReferenceOpen(true);
                      }}
                    />
                  ) : null}

                  {menuExtras.length > 0 ? (
                    <div className="mt-1 border-t border-hairline pt-1">
                      {menuExtras.map((extra) => (
                        <MenuItem
                          key={extra.id}
                          icon={extra.icon}
                          label={extra.label}
                          hint={extra.hint}
                          href={extra.href}
                          onClick={() => {
                            setMenuOpen(false);
                            extra.onSelect?.();
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {/* Grouped, so when this row wraps in a narrow column the mic and Send
            wrap together instead of a spacer taking a line of its own. */}
        <div className="ml-auto flex items-center gap-2">
        {allowVoice ? (
          <MicButton
            onSessionStart={() => {
              spokenBaseRef.current = value.trim();
              // Nobody should have to click into the box to see their words.
              textareaRef.current?.focus();
            }}
            onTranscript={(text) => {
              const base = spokenBaseRef.current ?? value.trim();
              spokenBaseRef.current = base;
              onChange(base ? `${base} ${text}` : text);
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
      </div>
    </div>
  );
}

const ICONS: Record<AttachmentKind, string> = {
  logo: '✦',
  image: '🖼',
  video: '🎬',
  reference: '🔗',
};

function MenuItem({
  icon,
  label,
  hint,
  onClick,
  href,
}: {
  icon: string;
  label: string;
  hint: string;
  onClick: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <span aria-hidden className="text-[14px]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[12.5px] text-ink-primary">{label}</span>
        <span className="block text-[11px] text-ink-muted">{hint}</span>
      </span>
    </>
  );
  const className = 'flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-white/5';

  // A link stays a link: middle-click and "open in new tab" keep working, which
  // a button pretending to navigate never does.
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="mt-2 shrink-0" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2.5 11.6 7 16 8.6 11.6 10.2 10 14.7 8.4 10.2 4 8.6 8.4 7 10 2.5Z"
        fill="var(--accent)"
        opacity="0.85"
      />
      <path d="M15.5 13.2 16.3 15.2 18.3 16 16.3 16.8 15.5 18.8 14.7 16.8 12.7 16 14.7 15.2 15.5 13.2Z" fill="var(--accent)" opacity="0.45" />
    </svg>
  );
}

'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';
import { pageLabel } from '@/lib/pages';

export interface Selection {
  lumenId: string;
  tag: string;
  kind: 'text' | 'image' | 'block' | 'link';
  label: string;
  text: string;
  src: string | null;
  alt: string | null;
  /** A picture inside this element, when it is a section rather than an image. */
  image?: { lumenId: string; src: string | null } | null;
  /** Where a link or button currently points. */
  href?: string | null;
  style: {
    fontSize: string;
    fontWeight: string;
    color: string;
    textAlign: string;
    backgroundColor: string;
  };
}

const FONT_SIZES = ['0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '2rem', '2.5rem', '3rem', '4rem'];
const WEIGHTS = [
  ['300', 'Light'],
  ['400', 'Regular'],
  ['500', 'Medium'],
  ['600', 'Semibold'],
  ['700', 'Bold'],
];
const ALIGNMENTS = [
  ['left', 'Left'],
  ['center', 'Centre'],
  ['right', 'Right'],
];

export interface PaletteToken {
  name: string;
  label: string;
  /** Resolved value, reported by the page, so the swatch shows the real colour. */
  value: string;
}

export function Inspector({
  selection,
  projectId,
  palette,
  pages,
  onText,
  onStyle,
  onImage,
  onLink,
  onRemove,
  onDuplicate,
}: {
  selection: Selection | null;
  projectId: string;
  palette: PaletteToken[];
  /** The site's own pages, so a button can point at one without typing a path. */
  pages: string[];
  onText: (value: string) => void;
  onStyle: (styles: Record<string, string>) => void;
  /** Targets the element itself, or a picture inside it when one is named. */
  onImage: (src: string, alt?: string, lumenId?: string) => void;
  onLink: (href: string) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`/api/projects/${projectId}/assets`, { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Upload failed');
      onImage(payload.url, file.name.replace(/\.[^.]+$/, ''), target ?? undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // Either the selected element is the picture, or it is a section with one in
  // it. Both can be swapped from here.
  const target = selection?.kind === 'image' ? selection.lumenId : (selection?.image?.lumenId ?? null);
  const currentSrc = selection?.kind === 'image' ? selection.src : (selection?.image?.src ?? null);

  if (!selection) {
    return (
      <div className="p-4">
        <p className="rounded-card border border-dashed border-hairline px-4 py-10 text-center text-[12.5px] leading-relaxed text-ink-muted">
          Click anything in the page to edit it, or pick a block on the left.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Selected</p>
        <p className="mt-1 truncate text-[13px] text-ink-primary">{selection.label}</p>
        {/* The tag and the internal id were on this line. Neither is anything
            the owner of a hair salon needs, or can do anything with. */}
        <p className="mt-0.5 text-[11px] text-ink-muted">{describeKind(selection)}</p>
      </div>

      {selection.kind === 'text' || selection.kind === 'link' ? (
        <Field label={selection.kind === 'link' ? 'Button text' : 'Text'}>
          <Textarea
            rows={selection.kind === 'link' ? 2 : 3}
            defaultValue={selection.text}
            key={selection.lumenId}
            onChange={(event) => onText(event.target.value)}
          />
        </Field>
      ) : null}

      {selection.kind === 'link' ? (
        <LinkTarget
          key={`${selection.lumenId}-href`}
          href={selection.href ?? ''}
          pages={pages}
          onChange={onLink}
        />
      ) : null}

      {target ? (
        <div className="space-y-3">
          <Field label={selection.kind === 'image' ? 'Picture' : 'Picture in this section'}>
            <Input
              defaultValue={currentSrc ?? ''}
              key={`${target}-src`}
              placeholder="https://…"
              onChange={(event) => onImage(event.target.value, undefined, target)}
            />
          </Field>
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload from your computer'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
          />
        </div>
      ) : null}

      <div className="space-y-3 border-t border-hairline pt-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Typography</p>

        <Field label="Size">
          <Select
            defaultValue=""
            key={`${selection.lumenId}-size`}
            onChange={(event) => onStyle({ 'font-size': event.target.value })}
          >
            <option value="">Inherit ({selection.style.fontSize})</option>
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Weight">
          <Select
            defaultValue=""
            key={`${selection.lumenId}-weight`}
            onChange={(event) => onStyle({ 'font-weight': event.target.value })}
          >
            <option value="">Inherit ({selection.style.fontWeight})</option>
            {WEIGHTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <span className="mb-1.5 block text-[13px] text-ink-secondary">Alignment</span>
          <div className="flex gap-1">
            {ALIGNMENTS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onStyle({ 'text-align': value })}
                className={cn(
                  'flex-1 rounded-[8px] border border-hairline px-2 py-1.5 text-[12px] transition',
                  selection.style.textAlign === value
                    ? 'border-accent/45 bg-accent-soft text-accent'
                    : 'text-ink-secondary hover:text-ink-primary',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ColourRow label="Text colour" palette={palette} onPick={(value) => onStyle({ color: value })} />
        <ColourRow
          label="Background"
          palette={palette}
          onPick={(value) => onStyle({ 'background-color': value })}
        />
      </div>

      <div className="flex gap-2 border-t border-hairline pt-4">
        <Button size="sm" variant="secondary" className="flex-1" onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button size="sm" variant="danger" className="flex-1" onClick={onRemove}>
          Delete
        </Button>
      </div>

      {error ? <p className="text-[12px] text-[#e5735a]">{error}</p> : null}
    </div>
  );
}

/**
 * Where a button goes.
 *
 * The common answer is another page of this site, so those are the options;
 * anything else is typed in full. A button whose text you can change but whose
 * destination you cannot is half a button.
 */
function LinkTarget({
  href,
  pages,
  onChange,
}: {
  href: string;
  pages: string[];
  onChange: (href: string) => void;
}) {
  const known = pages.includes(href);
  const [custom, setCustom] = useState(!known && href !== '');
  const [value, setValue] = useState(href);

  return (
    <div className="space-y-2">
      <Field label="Where it goes">
        <Select
          value={custom ? '__custom' : href}
          onChange={(event) => {
            const next = event.target.value;
            if (next === '__custom') {
              setCustom(true);
              return;
            }
            setCustom(false);
            onChange(next);
          }}
        >
          {!known && !custom ? <option value={href}>{href || 'Nowhere yet'}</option> : null}
          {pages.map((page) => (
            <option key={page} value={page}>
              {pageLabel(page)} page
            </option>
          ))}
          <option value="__custom">Somewhere else…</option>
        </Select>
      </Field>

      {custom ? (
        <Input
          value={value}
          placeholder="https://wa.me/919876543210"
          spellCheck={false}
          onChange={(event) => {
            setValue(event.target.value);
            const next = event.target.value.trim();
            // Only committed once it is something a browser can follow, so a
            // half-typed address never lands in the page.
            if (/^(https:\/\/|mailto:|tel:|#)/i.test(next)) onChange(next);
          }}
        />
      ) : null}
    </div>
  );
}

/** What the selected thing is, in words rather than in markup. */
function describeKind(selection: Selection): string {
  if (selection.kind === 'image') return 'Picture';
  if (selection.kind === 'link') return selection.tag === 'button' ? 'Button' : 'Link or button';
  if (selection.kind === 'text') {
    if (/^h[1-6]$/.test(selection.tag)) return 'Heading';
    if (selection.tag === 'a') return 'Link';
    if (selection.tag === 'li') return 'List item';
    return 'Text';
  }
  return selection.image ? 'Section with a picture' : 'Section';
}

function ColourRow({
  label,
  palette,
  onPick,
}: {
  label: string;
  palette: PaletteToken[];
  onPick: (value: string) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] text-ink-secondary">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {palette.length === 0 ? (
          <span className="text-[11.5px] text-ink-muted">Loading the page palette…</span>
        ) : null}
        {palette.map((token) => (
          <button
            key={token.name}
            type="button"
            title={`${token.label} — ${token.value}`}
            // The written value stays a var() so it tracks later theme changes,
            // while the swatch shows the colour the page actually resolves to.
            onClick={() => onPick(`var(${token.name})`)}
            className="h-7 w-7 rounded-[7px] border border-hairline transition hover:scale-110"
            style={{ background: token.value }}
          />
        ))}
        <button
          type="button"
          title="Clear"
          onClick={() => onPick('')}
          className="h-7 rounded-[7px] border border-hairline px-2 text-[11px] text-ink-muted transition hover:text-ink-primary"
        >
          clear
        </button>
      </div>
    </div>
  );
}

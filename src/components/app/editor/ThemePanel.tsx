'use client';

import { useState } from 'react';
import { asHex } from '@/lib/theme-tokens';
import { fontsFor, type FontChoice } from '@/lib/fonts';
import type { PaletteToken } from './Inspector';

/** Groups, the way a theme editor has them — one open at a time. */
type Group = 'colours' | 'type' | 'shape';

/** Corner rounding and section spacing, as choices rather than numbers. */
const ROUNDING: { label: string; radius: string; large: string }[] = [
  { label: 'Square', radius: '0px', large: '0px' },
  { label: 'Soft', radius: '10px', large: '18px' },
  { label: 'Rounded', radius: '16px', large: '28px' },
  { label: 'Pill', radius: '24px', large: '40px' },
];

const SPACING: { label: string; section: string; gap: string }[] = [
  { label: 'Tight', section: '3.5rem', gap: '1rem' },
  { label: 'Regular', section: '5rem', gap: '1.5rem' },
  { label: 'Airy', section: '7rem', gap: '2rem' },
];

/**
 * The site's palette, edited once and applied everywhere.
 *
 * This is what "change the colours" should always have meant. Picking a colour
 * on a single element only ever repainted that element; the theme lives in the
 * stylesheet, so changing it here changes every heading, every button and every
 * band on every page at once.
 */
export function ThemePanel({
  palette,
  onToken,
  onFont,
  loading,
}: {
  palette: PaletteToken[];
  onToken: (name: string, value: string) => void;
  onFont: (role: 'display' | 'body', family: string, googleHref: string | null) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState<Group>('colours');
  if (loading && palette.length === 0) {
    return <p className="p-4 text-[12px] text-ink-muted">Reading the site&rsquo;s palette…</p>;
  }

  if (palette.length === 0) {
    return (
      <p className="p-4 text-[12px] leading-relaxed text-ink-muted">
        This page does not define a palette, so there is nothing to change site-wide. You can still
        recolour anything by selecting it in the page.
      </p>
    );
  }

  return (
    <div className="p-3">
      <Section
        title="Colour palette"
        open={open === 'colours'}
        onToggle={() => setOpen('colours')}
      >
      {palette.map((token) => {
        const hex = asHex(token.value);
        return (
          <label
            key={token.name}
            className="lumen-raise flex items-center gap-3 rounded-[10px] border border-hairline p-2.5"
          >
            <span
              className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[8px] border border-hairline"
              style={{ background: token.value }}
            >
              {/* The native picker sits invisibly on the swatch, so the swatch
                  is the control rather than a decoration next to one. */}
              <input
                type="color"
                value={hex ?? '#000000'}
                onChange={(event) => onToken(token.name, event.target.value)}
                aria-label={token.label}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] text-ink-primary">{token.label}</span>
              <span className="block truncate font-mono text-[10.5px] text-ink-muted">
                {hex ?? token.value}
              </span>
            </span>
          </label>
        );
      })}

      </Section>

      <Section title="Typography" open={open === 'type'} onToggle={() => setOpen('type')}>
        <FontPicker role="display" label="Headings" onPick={onFont} />
        <FontPicker role="body" label="Body text" onPick={onFont} />
      </Section>

      <Section title="Shape and spacing" open={open === 'shape'} onToggle={() => setOpen('shape')}>
        <Choices
          label="Corners"
          options={ROUNDING.map((option) => option.label)}
          onPick={(index) => {
            onToken('--radius', ROUNDING[index].radius);
            onToken('--radius-lg', ROUNDING[index].large);
          }}
        />
        <Choices
          label="Section spacing"
          options={SPACING.map((option) => option.label)}
          onPick={(index) => {
            onToken('--section-y', SPACING[index].section);
            onToken('--gap', SPACING[index].gap);
          }}
        />
      </Section>

      <p className="px-1 pt-3 text-[11px] leading-relaxed text-ink-muted">
        Changes show immediately and apply to every page. Save to keep them.
      </p>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-1 py-2.5 text-left"
      >
        <span className={`text-[12.5px] ${open ? 'text-ink-primary' : 'text-ink-secondary'}`}>
          {title}
        </span>
        <span className={`text-[11px] text-ink-muted transition ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open ? <div className="space-y-1.5 pb-3">{children}</div> : null}
    </div>
  );
}

function FontPicker({
  role,
  label,
  onPick,
}: {
  role: 'display' | 'body';
  label: string;
  onPick: (role: 'display' | 'body', family: string, googleHref: string | null) => void;
}) {
  const [chosen, setChosen] = useState<string>('');
  const options: FontChoice[] = fontsFor(role);

  return (
    <label className="block px-1">
      <span className="mb-1 block text-[11px] text-ink-muted">{label}</span>
      <select
        value={chosen}
        onChange={(event) => {
          setChosen(event.target.value);
          const font = options.find((option) => option.id === event.target.value);
          if (font) onPick(role, font.family, font.googleHref);
        }}
        className="lumen-well w-full rounded-[9px] border border-hairline px-2.5 py-1.5 text-[12.5px] text-ink-primary outline-none focus:border-accent/50"
      >
        <option value="">Leave as it is</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Choices({
  label,
  options,
  onPick,
}: {
  label: string;
  options: string[];
  onPick: (index: number) => void;
}) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="px-1">
      <span className="mb-1 block text-[11px] text-ink-muted">{label}</span>
      <div className="flex gap-1">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setActive(index);
              onPick(index);
            }}
            className={`flex-1 rounded-[8px] border px-1.5 py-1.5 text-[11px] transition ${
              active === index
                ? 'border-accent/50 bg-accent-soft text-accent'
                : 'border-hairline text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

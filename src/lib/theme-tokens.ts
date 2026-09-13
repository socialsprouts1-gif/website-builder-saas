/**
 * The colours a site's theme is made of.
 *
 * One list, used by three things that had drifted apart: the bridge that reads
 * a page's palette, the blocks the editor inserts, and the theme panel that
 * edits it. The editor was still asking pages for `--color-accent` long after
 * the generator started writing `--accent`, so the palette came back empty and
 * every colour change wrote a variable that resolved to nothing. That is why
 * changing a colour appeared to do nothing at all.
 *
 * Each entry lists the current name first and the older one after it. A page
 * answers with whichever it actually defines, so sites generated before the
 * component library still edit correctly.
 */

export interface ThemeColour {
  /** Candidate custom properties, current name first. */
  names: string[];
  label: string;
  hint: string;
}

export const THEME_COLOURS: ThemeColour[] = [
  { names: ['--bg', '--color-background'], label: 'Page', hint: 'Behind everything' },
  { names: ['--surface', '--color-surface'], label: 'Cards', hint: 'Panels and cards' },
  { names: ['--surface-alt'], label: 'Bands', hint: 'Alternating sections' },
  { names: ['--ink', '--color-text'], label: 'Text', hint: 'Headings and body' },
  { names: ['--ink-muted', '--color-text-muted'], label: 'Muted text', hint: 'Secondary lines' },
  { names: ['--accent', '--color-accent'], label: 'Accent', hint: 'Buttons and links' },
  {
    names: ['--accent-ink', '--color-accent-contrast'],
    label: 'On accent',
    hint: 'Text on accent buttons',
  },
  { names: ['--border', '--color-border'], label: 'Lines', hint: 'Borders and rules' },
];

/**
 * A CSS value a colour input can show.
 *
 * Browsers only put `#rrggbb` in a colour input, and a page may express a
 * token as `rgb()`, a name, or something else entirely. Anything not already
 * hex is shown as a swatch with its text value instead of being silently
 * rounded to the nearest hex.
 */
export function asHex(value: string): string | null {
  const text = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(text)) {
    const [, r, g, b] = /^#(.)(.)(.)$/.exec(text)!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
  if (rgb) {
    const channel = (raw: string) =>
      Math.max(0, Math.min(255, Math.round(Number(raw)))).toString(16).padStart(2, '0');
    return `#${channel(rgb[1])}${channel(rgb[2])}${channel(rgb[3])}`;
  }

  return null;
}

/** The JS literal the in-page bridge probes with. Kept in step by construction. */
export function themeColourProbeSource(): string {
  return JSON.stringify(THEME_COLOURS.map((colour) => [colour.names, colour.label]));
}

import { describe, expect, it } from 'vitest';
import { AVATAR_PRESETS, CHAT_THEMES, avatarById, themeById, themeCss } from './chatbot-theme';

describe('the chat themes', () => {
  it('offers several distinct looks, each fully specified', () => {
    expect(CHAT_THEMES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(CHAT_THEMES.map((theme) => theme.id)).size).toBe(CHAT_THEMES.length);
    for (const theme of CHAT_THEMES) {
      for (const key of ['panel', 'ink', 'inkMuted', 'botBubble', 'line', 'shadow', 'font'] as const) {
        expect(String(theme[key]).trim(), `${theme.id}.${key}`).not.toBe('');
      }
      expect(theme.note.length, theme.id).toBeGreaterThan(15);
    }
  });

  /** A theme id that no longer exists must not render an unstyled widget. */
  it('falls back rather than rendering nothing', () => {
    expect(themeById('nonsense').id).toBe(CHAT_THEMES[0].id);
    expect(themeById(null).id).toBe(CHAT_THEMES[0].id);
  });

  it('writes the site’s accent into every theme, not Lumen’s', () => {
    for (const theme of CHAT_THEMES) {
      const css = themeCss(theme, '#b57cff');
      expect(css, theme.id).toContain('#b57cff');
      // Lumen's own lime must never reach somebody else's site.
      expect(css.toLowerCase(), theme.id).not.toContain('#d7ff3e');
    }
  });

  /**
   * The widget is one script on a stranger's page. Anything it writes has to
   * survive a site with its own aggressive CSS, which is what the z-index and
   * the explicit font stack are for.
   */
  it('survives being dropped on somebody else’s page', () => {
    const css = themeCss(CHAT_THEMES[0], '#111111');
    expect(css).toContain('z-index:2147483000');
    expect(css).toMatch(/\.lumen-panel\{[^}]*position:fixed/);
    expect(css).toMatch(/font:\d/);
  });

  it('stops moving for anyone who asked for less motion', () => {
    for (const theme of CHAT_THEMES) {
      expect(themeCss(theme, '#111111'), theme.id).toContain('prefers-reduced-motion');
    }
  });

  it('fits a phone', () => {
    expect(themeCss(CHAT_THEMES[0], '#111111')).toContain('@media (max-width:420px)');
  });
});

describe('the avatars', () => {
  it('offers faces, each real SVG, plus the option of none', () => {
    expect(AVATAR_PRESETS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(AVATAR_PRESETS.map((preset) => preset.id)).size).toBe(AVATAR_PRESETS.length);

    for (const preset of AVATAR_PRESETS) {
      if (preset.id === 'none') {
        expect(preset.svg).toBe('');
        continue;
      }
      expect(preset.svg, preset.id).toMatch(/^<svg[\s\S]*<\/svg>$/);
      // currentColor, so each face takes the site's accent rather than
      // carrying a colour of its own onto somebody else's brand.
      expect(preset.svg, preset.id).toContain('currentColor');
      // Decoration beside a name that is already read out.
      expect(preset.svg, preset.id).toContain('aria-hidden');
      // Nothing that could execute or fetch on a customer's page.
      expect(preset.svg.toLowerCase(), preset.id).not.toMatch(/<script|onload|href|xlink/);
    }
  });

  it('copes with a face that is no longer offered', () => {
    expect(avatarById('nonsense')).toBeUndefined();
    expect(avatarById(null)).toBeUndefined();
  });
});

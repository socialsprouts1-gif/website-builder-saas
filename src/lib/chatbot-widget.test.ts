import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { widgetSource } from './chatbot-widget';
import { CHAT_THEMES, avatarById, themeCss } from './chatbot-theme';

/**
 * The script a published site actually loads.
 *
 * This file exists because of a bug that shipped: a `\n` typed into a template
 * literal became a real newline, every generated site served a script with an
 * unterminated string in it, and the whole thing — menu, forms, WhatsApp
 * handoff — silently did nothing. Reading the code did not show it. Parsing
 * the output does.
 */

const config = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    endpoint: 'https://example.com/api/chatbot/abc',
    name: 'Rani Sarees',
    greeting: 'Namaste! How can I help?',
    css: themeCss(CHAT_THEMES[0], '#15150f'),
    avatarUrl: null,
    avatarSvg: avatarById('spark')?.svg ?? '',
    voice: true,
    voiceEndpoint: 'https://example.com/api/chatbot/abc/voice',
    ...over,
  });

/** Parses without running. A syntax error throws here; nothing executes. */
const parses = (source: string) => {
  // eslint-disable-next-line no-new-func
  new Function(source);
  return true;
};

describe('the widget script', () => {
  it('is valid JavaScript', () => {
    expect(parses(widgetSource(config()))).toBe(true);
  });

  it('is valid JavaScript with voice off, no avatar and an empty greeting', () => {
    expect(
      parses(widgetSource(config({ voice: false, avatarSvg: '', greeting: '' }))),
    ).toBe(true);
  });

  it('is valid JavaScript for every theme', () => {
    for (const theme of CHAT_THEMES) {
      const source = widgetSource(config({ css: themeCss(theme, '#b23a6f') }));
      expect(parses(source), theme.id).toBe(true);
    }
  });

  /**
   * The failure that started all of this. A newline inside a JavaScript string
   * literal is a syntax error, and `'...\n...'` written with a real newline is
   * exactly that — so no single-quoted literal in the output may span lines.
   */
  it('has no string literal broken across lines', () => {
    const source = widgetSource(config());
    const offenders = source
      .split('\n')
      .map((line, index) => [index + 1, line] as const)
      // Prose is allowed its apostrophes; this is about code.
      .filter(([, line]) => !line.trim().startsWith('//'))
      .filter(([, line]) => (line.match(/(?<!\\)'/g)?.length ?? 0) % 2 === 1)
      .map(([number, line]) => `${number}: ${line.trim()}`);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('runs once however many times it is loaded', () => {
    expect(widgetSource(config())).toContain('window.__lumenWidgetLoaded');
  });

  it('carries its own styling rather than inheriting the host page’s', () => {
    const source = widgetSource(config({ css: themeCss(CHAT_THEMES[0], '#ff0066') }));
    expect(source).toContain('#ff0066');
  });

  /** A site's own owner can type the name, so it must not be able to close the script. */
  it('cannot be broken out of by a quote in the name', () => {
    for (const name of [`Rani's "Best" Sarees`, 'a\\b', '</script><script>x()</script>', 'line\nbreak']) {
      expect(parses(widgetSource(config({ name }))), name).toBe(true);
    }
  });

  /**
   * The widget and the endpoint are written in different files and never type
   * checked against each other — the script is a string. A renamed field here
   * is a chat bubble that answers every question with "sorry, something went
   * wrong", on every published site, and nothing else would notice.
   */
  it('reads the field the reply endpoint writes', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/chatbot/[embedKey]/route.ts'),
      'utf8',
    );
    expect(route).toMatch(/NextResponse\.json\(\{\s*answer/);
    expect(widgetSource(config())).toContain('payload.answer');
  });

  /**
   * Found by rendering it: open, the launcher kept the speech-bubble mark and
   * span 90°, which looks like a rendering fault rather than a way out.
   */
  it('changes the launcher mark and its label together', () => {
    const source = widgetSource(config());
    expect(source).toContain("bubble.innerHTML = open ? ICON_CLOSE : ICON_CHAT");
    expect(source).toContain("open ? 'Close chat' : 'Open chat'");
  });

  it('does not spin the launcher instead of changing it', () => {
    expect(themeCss(CHAT_THEMES[0], '#15150f')).not.toMatch(/lumen-bubble\[data-open="1"\]\{[^}]*rotate/);
  });

  it('asks for the microphone only when voice is switched on', () => {
    expect(widgetSource(config({ voice: true }))).toContain('getUserMedia');
    expect(widgetSource(config())).toContain('CONFIG.voice');
  });
});

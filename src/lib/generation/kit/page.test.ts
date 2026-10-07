import { describe, expect, it } from 'vitest';
import { SITE_SCRIPT, renderPage } from './page';
import { normaliseTokens } from './tokens';
import type { Section } from './sections';

const tokens = normaliseTokens({ palette: { accent: '#b57cff' } });

const site = {
  businessName: 'Ridge 3D',
  tagline: 'A desert that moves when you do.',
  pages: [{ path: 'index.html', title: 'Home' }],
  contact: { email: 'hello@ridge3d.in' },
  tokens,
};

const sections: Section[] = [
  { id: 'hero', kind: 'hero', layout: 'centre', heading: 'Ridge 3D' },
  { id: 'scene', kind: 'scene3d', layout: 'world', heading: 'Walk the ridge', items: [{ title: 'The wreck' }] },
];

/**
 * The script every generated site ships.
 *
 * It had never been checked, and it had not parsed for a long time: a `\n`
 * written inside the template literal that builds it became a real newline in
 * the emitted file, which ended a single-quoted string mid-line. The browser
 * threw SyntaxError on load and the whole file stopped — so on every site
 * Lumen had published, the mobile menu did not open, the enquiry form did not
 * submit, the WhatsApp handoff never fired and the footer year never filled in.
 *
 * None of that is visible from reading the source, because the source is
 * correct TypeScript. It is only visible from parsing the output, which is what
 * this does.
 */
describe('the site script', () => {
  it('parses', () => {
    expect(() => new Function(SITE_SCRIPT)).not.toThrow();
  });

  /**
   * The specific shape of that bug, so it cannot come back by the same route:
   * a quoted string in the emitted script must never contain a literal
   * newline. Checked by scanning the output rather than by looking for one
   * known line, because the next one will be somewhere else.
   */
  it('never breaks a quoted string across a line', () => {
    for (const [index, line] of SITE_SCRIPT.split('\n').entries()) {
      // Strip escaped quotes, then every complete string, and anything left
      // over is a quote that was still open when the line ended.
      const stripped = line
        .replace(/\\['"]/g, '')
        .replace(/'[^'\n]*'/g, '')
        .replace(/"[^"\n]*"/g, '');
      expect(
        stripped.replace(/\/\/.*$/, ''),
        `line ${index + 1} ends inside a string: ${line.trim()}`,
      ).not.toMatch(/['"]/);
    }
  });

  it('still carries the lines that make a site work', () => {
    // The four things the script is for. A file that parses but lost one of
    // them is the same outage with a quieter failure.
    expect(SITE_SCRIPT).toContain('.nav__toggle');
    expect(SITE_SCRIPT).toContain('[data-lumen-form]');
    expect(SITE_SCRIPT).toContain('[data-lumen-year]');
    expect(SITE_SCRIPT).toContain('lumen-whatsapp');
  });

  /**
   * The WhatsApp message is multi-line, and it has to still be multi-line when
   * the browser reads it — which means the emitted file carries the two
   * characters backslash-n, not an actual line break.
   */
  it('escapes the newlines in the WhatsApp summary rather than taking them', () => {
    const summary = SITE_SCRIPT.split('\n').find((line) => line.includes('from your website'))!;
    expect(summary).toBeTruthy();
    // Backslash-n, as two characters, twice: once ending the first line and
    // once as the separator passed to join.
    expect(summary).toContain(String.raw`' from your website\n'`);
    expect(summary).toContain(String.raw`lines.join('\n')`);
  });

});

describe('a rendered page', () => {
  const html = renderPage(site, {
    path: 'index.html',
    title: 'Home',
    description: 'A desert that moves when you do.',
    sections,
  });

  it('loads its own script and stylesheet, and nothing from anywhere else', () => {
    expect(html).toContain('<script src="script.js" defer></script>');
    expect(html).toContain('<link rel="stylesheet" href="styles.css" />');
    // A published site runs under `script-src 'self'`; a third-party script
    // would be blocked, so one here is a section that silently does nothing.
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((match) => match[1]);
    expect(scripts).toEqual(['script.js']);
  });

  it('puts the 3D section on the page it was asked for', () => {
    expect(html).toContain('data-section="scene3d"');
    expect(html).toContain('data-s3d="world"');
  });
});

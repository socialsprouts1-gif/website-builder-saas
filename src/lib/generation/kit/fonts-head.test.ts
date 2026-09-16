import { describe, expect, it } from 'vitest';
import { withFontLink } from './fonts-head';

const HREF = 'https://fonts.googleapis.com/css2?family=Fraunces&display=swap';
const page = '<!doctype html><html><head><title>Home</title></head><body>x</body></html>';

describe('withFontLink', () => {
  it('adds the stylesheet the typeface needs', () => {
    const out = withFontLink(page, HREF);
    expect(out).toContain(`href="${HREF}"`);
    expect(out).toContain('rel="preconnect"');
    expect(out.indexOf('fonts.googleapis')).toBeLessThan(out.indexOf('</head>'));
  });

  // Otherwise a site accumulates the fonts of every look it has ever worn,
  // each one a request the visitor pays for.
  it('replaces the previous one rather than stacking', () => {
    const once = withFontLink(page, HREF);
    const twice = withFontLink(once, 'https://fonts.googleapis.com/css2?family=Inter');
    expect(twice.match(/fonts\.googleapis/g)).toHaveLength(1);
    expect(twice).toContain('family=Inter');
    expect(twice).not.toContain('family=Fraunces');
  });

  it('takes the link away when a look wants system fonts', () => {
    expect(withFontLink(withFontLink(page, HREF), null)).not.toContain('fonts.googleapis');
  });

  it('is idempotent', () => {
    const once = withFontLink(page, HREF);
    expect(withFontLink(once, HREF)).toBe(once);
  });

  it('leaves the rest of the page alone', () => {
    const out = withFontLink(page, HREF);
    expect(out).toContain('<title>Home</title>');
    expect(out).toContain('<body>x</body>');
  });

  it('escapes a quote rather than breaking out of the attribute', () => {
    expect(withFontLink(page, 'https://fonts.googleapis.com/css2?family=A"onload=x')).not.toContain(
      '"onload=x',
    );
  });

  it('has nothing to do to a fragment with no head', () => {
    expect(withFontLink('<div>hi</div>', HREF)).toBe('<div>hi</div>');
  });
});

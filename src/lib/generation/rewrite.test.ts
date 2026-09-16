import { describe, expect, it } from 'vitest';
import { isSafeSection } from './rewrite';

/**
 * What a rewritten section is allowed to be.
 *
 * This is markup a model wrote, going onto a page served to the public from
 * Lumen's own domain. The model is not adversarial, but it is not careful
 * either, and "it usually returns clean HTML" is not a security property.
 */
const ok = '<section class="section" data-section="hero" data-lumen-id="hero-1"><h1>Hello</h1></section>';

describe('isSafeSection', () => {
  it('accepts a section that came back as asked', () => {
    expect(isSafeSection(ok, 'hero-1')).toBeNull();
  });

  it.each([
    ['a script', '<section data-lumen-id="hero-1"><script>alert(1)</script></section>'],
    ['a frame', '<section data-lumen-id="hero-1"><iframe src="//evil"></iframe></section>'],
    ['an object', '<section data-lumen-id="hero-1"><object data="x"></object></section>'],
    ['a stylesheet link', '<section data-lumen-id="hero-1"><link rel="stylesheet" href="//evil"></section>'],
    ['an inline handler', '<section data-lumen-id="hero-1"><img src="x" onerror="alert(1)"></section>'],
    ['a javascript: link', '<section data-lumen-id="hero-1"><a href="javascript:alert(1)">go</a></section>'],
  ])('refuses %s', (_label, html) => {
    expect(isSafeSection(html, 'hero-1')).toBeTruthy();
  });

  // Without its id the section becomes unaddressable: the editor could not
  // select it again, and a second rewrite would have nothing to find.
  it('refuses a section that lost its identifier', () => {
    expect(isSafeSection('<section class="section"><h1>Hello</h1></section>', 'hero-1')).toMatch(
      /identifier/,
    );
  });

  it('refuses a section that came back as the wrong one', () => {
    expect(isSafeSection(ok, 'hero-2')).toMatch(/identifier/);
  });

  it.each([
    ['nothing at all', ''],
    ['only whitespace', '   \n  '],
    ['prose instead of markup', 'Here is your new hero section!'],
  ])('refuses %s', (_label, html) => {
    expect(isSafeSection(html, 'hero-1')).toBeTruthy();
  });

  it('refuses something absurdly long', () => {
    const huge = `<section data-lumen-id="hero-1">${'x'.repeat(21_000)}</section>`;
    expect(isSafeSection(huge, 'hero-1')).toMatch(/too long/);
  });

  it('says why, in words that can be shown to someone', () => {
    const reason = isSafeSection('<section data-lumen-id="hero-1"><script>x</script></section>', 'hero-1');
    expect(reason).toBe('it contained a script or a frame');
  });

  it('allows the ordinary things a section is made of', () => {
    const rich =
      '<section class="section" data-section="services" data-lumen-id="s-1">' +
      '<h2 data-lumen-id="s-1-h">Our services</h2>' +
      '<img src="https://cdn.example/a.jpg" alt="A haircut" loading="lazy" />' +
      '<a class="btn" href="contact.html">Book now</a></section>';
    expect(isSafeSection(rich, 's-1')).toBeNull();
  });
});

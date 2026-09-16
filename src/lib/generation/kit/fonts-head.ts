/**
 * The stylesheet link a typeface needs, in the page head.
 *
 * Fonts are the one part of a design that cannot live in the stylesheet: the
 * page has to fetch them itself. So changing the look has to reach into each
 * page's head, and has to be able to take a link away as well as add one —
 * otherwise a site accumulates the fonts of every look it has ever worn.
 */
const LUMEN_FONT = /\s*<link[^>]*data-lumen-font[^>]*>/gi;
const GOOGLE_FONT = /\s*<link[^>]*href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*>/gi;

export function withFontLink(html: string, href: string | null): string {
  const stripped = html.replace(LUMEN_FONT, '').replace(GOOGLE_FONT, '');
  if (!href || !/<head[^>]*>/i.test(stripped)) return stripped;

  const tag =
    `\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin data-lumen-font />` +
    `\n<link rel="stylesheet" href="${href.replace(/"/g, '&quot;')}" data-lumen-font />`;

  return stripped.replace(/<head([^>]*)>/i, (match) => `${match}${tag}`);
}

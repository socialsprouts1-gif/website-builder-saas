import { escapeHtml } from './sections';

/**
 * The page a visitor gets when a page of the site does not exist yet.
 *
 * A site is written page by page, so for a minute or two the nav can point at a
 * page that has not been assembled yet — and a customer who follows that link
 * should not be met with the word "Not found" in Times New Roman on white.
 *
 * When the site's own stylesheet exists this borrows it, so the holding page
 * has the site's colours, fonts and nav rhythm and reads as part of the site
 * rather than as something that broke.
 */
export function pendingPage(options: {
  /** Document title. */
  title: string;
  heading: string;
  message: string;
  /** Where "back to the homepage" goes, relative to this page. */
  homeHref?: string;
  /** Relative href of the site's stylesheet, when the site has one. */
  stylesheet?: string | null;
  /**
   * The stylesheet's contents, for the preview iframe — it is sandboxed into an
   * opaque origin where a linked file cannot load at all.
   */
  css?: string | null;
  label?: string;
}): string {
  const { title, heading, message, homeHref, stylesheet, css, label } = options;

  const styled = Boolean(stylesheet) || Boolean(css);
  const fallback = `<style>
:root { color-scheme: light }
body { margin:0; font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; background:#f7f6f3; color:#1a1a17 }
.wrap { min-height:100vh; display:grid; place-items:center; padding:3rem 1.5rem; text-align:center }
h1 { font-size:clamp(1.6rem,4vw,2.4rem); margin:0 0 .75rem; letter-spacing:-0.02em }
p { margin:0 auto 2rem; max-width:34rem; color:#57564f }
.badge { display:inline-block; margin-bottom:1.25rem; font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; color:#8a8880 }
.btn { display:inline-block; padding:.85rem 1.6rem; border-radius:999px; background:#1a1a17; color:#fff; text-decoration:none }
</style>`;

  const siteStyles = css
    ? `<style>\n${css}\n</style>`
    : stylesheet
      ? `<link rel="stylesheet" href="${escapeHtml(stylesheet)}" />`
      : '';

  const head = styled ? `${siteStyles}\n${fallbackForStyled()}` : fallback;

  const home = homeHref
    ? `<a class="btn" href="${escapeHtml(homeHref)}">Back to the homepage</a>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${escapeHtml(title)}</title>
${head}
</head>
<body>
<main class="wrap section">
  <div class="shell">
    ${label ? `<p class="badge">${escapeHtml(label)}</p>` : ''}
    <h1>${escapeHtml(heading)}</h1>
    <p>${escapeHtml(message)}</p>
    ${home}
  </div>
</main>
</body>
</html>
`;
}

/**
 * The few rules the holding page needs on top of the site's own stylesheet:
 * the site has no "centre this in the viewport" layout of its own.
 */
function fallbackForStyled(): string {
  return `<style>
.wrap { min-height:100vh; display:grid; place-items:center; text-align:center }
.wrap .shell { max-width:36rem }
.wrap h1 { margin:0 0 .75rem }
.wrap p { margin:0 auto 2rem }
</style>`;
}

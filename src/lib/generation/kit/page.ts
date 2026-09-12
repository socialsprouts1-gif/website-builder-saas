import type { DesignTokens } from './tokens';
import { escapeHtml, renderSection, safeHref, type Section } from './sections';

/**
 * Assembling sections into a page.
 *
 * Everything outside the sections — the document, the nav, the footer, the
 * alternating band rhythm — is decided here rather than by the model, so every
 * page of every site has the same skeleton and the same accessibility.
 */

export interface PageSpec {
  path: string;
  title: string;
  description: string;
  sections: Section[];
}

export interface SiteSpec {
  businessName: string;
  tagline: string;
  pages: { path: string; title: string }[];
  /** Shown in the footer, where a real business's details belong. */
  contact: { address?: string; phone?: string; email?: string };
  /** Attribution lines, such as a link back to a Google listing. */
  footerNote?: string;
  tokens: DesignTokens;
}

/**
 * Bands alternate so a long page has rhythm, but never two the same in a row
 * and never behind the hero. Left to the model this came out as either one flat
 * colour or a stripe per section.
 */
export function assignTones(sections: Section[]): Section[] {
  let index = 0;
  return sections.map((section) => {
    if (section.kind === 'hero') return { ...section, tone: 'base' };
    const tone = index % 2 === 0 ? 'base' : 'alt';
    index += 1;
    return { ...section, tone: section.kind === 'cta' ? 'surface' : (tone as Section['tone']) };
  });
}

function nav(site: SiteSpec, current: string): string {
  const links = site.pages
    .map((page) => {
      const active = page.path === current ? ' aria-current="page"' : '';
      return `<a href="${safeHref(page.path)}"${active}>${escapeHtml(page.title)}</a>`;
    })
    .join('');

  return `<header class="nav">
  <div class="shell nav__inner">
    <a class="nav__brand" href="index.html">${escapeHtml(site.businessName)}</a>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">☰</button>
    <nav class="nav__links" id="site-nav">${links}</nav>
  </div>
</header>`;
}

function footer(site: SiteSpec): string {
  const links = site.pages
    .map((page) => `<p><a href="${safeHref(page.path)}">${escapeHtml(page.title)}</a></p>`)
    .join('');

  const contact = [
    site.contact.address ? `<p>${escapeHtml(site.contact.address)}</p>` : '',
    site.contact.phone ? `<p><a href="tel:${escapeHtml(site.contact.phone.replace(/\s+/g, ''))}">${escapeHtml(site.contact.phone)}</a></p>` : '',
    site.contact.email ? `<p><a href="mailto:${escapeHtml(site.contact.email)}">${escapeHtml(site.contact.email)}</a></p>` : '',
  ].join('');

  return `<footer class="footer">
  <div class="shell footer__grid">
    <div>
      <p class="nav__brand">${escapeHtml(site.businessName)}</p>
      <p class="muted">${escapeHtml(site.tagline)}</p>
      ${site.footerNote ? `<p class="muted">${site.footerNote}</p>` : ''}
    </div>
    <div>${links}</div>
    <div>${contact}</div>
  </div>
  <div class="shell" style="margin-top:2rem">
    <p class="muted">© <span data-lumen-year>${new Date().getFullYear()}</span> ${escapeHtml(site.businessName)}. Built with Lumen.</p>
  </div>
</footer>`;
}

export function renderPage(site: SiteSpec, page: PageSpec): string {
  const sections = assignTones(page.sections).map(renderSection).join('\n');
  const fonts = site.tokens.fonts.googleHref;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}" />
<meta property="og:title" content="${escapeHtml(page.title)}" />
<meta property="og:description" content="${escapeHtml(page.description)}" />
<meta property="og:type" content="website" />
${fonts ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n<link rel="stylesheet" href="${escapeHtml(fonts)}" />` : ''}
<link rel="stylesheet" href="styles.css" />
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${nav(site, page.path)}
<main id="main">
${sections}
</main>
${footer(site)}
<script src="script.js" defer></script>
</body>
</html>
`;
}

/** The only script a generated site needs. Written once, not per site. */
export const SITE_SCRIPT = `(function () {
  var toggle = document.querySelector('.nav__toggle');
  var links = document.getElementById('site-nav');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  document.querySelectorAll('[data-lumen-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var status = form.querySelector('[data-lumen-form-status]');
      if (!form.checkValidity()) {
        if (status) status.textContent = 'Please fill in your name and how to reach you.';
        return;
      }
      form.reset();
      if (status) status.textContent = 'Thank you — we will be in touch shortly.';
    });
  });

  document.querySelectorAll('[data-lumen-year]').forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });
})();
`;

import type { DesignTokens } from './tokens';
import { escapeHtml, renderSection, safeHref, type Section } from './sections';
import { PREMIUM_SCRIPT } from './premium';

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
  /**
   * Markup appended inside `<main>`, after the sections.
   *
   * One thing uses this: the empty markers a shop carries, which are filled
   * from the database when the page is served. It is not a way for a model to
   * get markup into a page — nothing that reaches here was written by one.
   */
  extra?: string;
  /**
   * Where the extra goes, counted in sections.
   *
   * Appended at the end by default, which is right for a page that is nothing
   * but a shop. On a home page it belongs directly under the hero: products
   * below the closing call to action are products nobody scrolls to.
   */
  extraAfter?: number;
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
  // The announcement bar belongs above the navigation and outside <main>: it is
  // a notice about the site, not content of the page, and dropping it into the
  // section rhythm would give it a band colour and a heading level it should
  // not have. A template that names it anywhere in its list still gets it here.
  const banner = page.sections.filter((section) => section.kind === 'announcement');
  const body = page.sections.filter((section) => section.kind !== 'announcement');

  const rendered = assignTones(body).map(renderSection);
  const at = page.extra
    ? Math.min(Math.max(page.extraAfter ?? rendered.length, 0), rendered.length)
    : rendered.length;

  const sections = [...rendered.slice(0, at), page.extra ?? '', ...rendered.slice(at)]
    .filter(Boolean)
    .join('\n');
  const announcement = banner.slice(0, 1).map(renderSection).join('');
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
${announcement}${nav(site, page.path)}
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

  var endpoint = (document.querySelector('meta[name="lumen-leads"]') || {}).content;
  var handoff = (document.querySelector('meta[name="lumen-whatsapp"]') || {}).content;

  document.querySelectorAll('[data-lumen-form]').forEach(function (form) {
    // A field no person can see, so no person fills it in. The cheapest spam
    // filter there is, and it costs a real visitor nothing.
    var trap = document.createElement('input');
    trap.type = 'text';
    trap.name = 'website';
    trap.tabIndex = -1;
    trap.autocomplete = 'off';
    trap.setAttribute('aria-hidden', 'true');
    trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
    form.appendChild(trap);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var status = form.querySelector('[data-lumen-form-status]');
      if (!form.checkValidity()) {
        if (status) status.textContent = 'Please fill in your name and how to reach you.';
        return;
      }

      var data = new FormData(form);
      var pick = function (names) {
        for (var i = 0; i < names.length; i++) {
          var value = data.get(names[i]);
          if (value) return String(value);
        }
        return '';
      };

      // The model names these fields, and it does not always name them the
      // same way. Read by likely name rather than by an exact contract, so a
      // form written slightly differently still delivers its lead.
      var booking = form.hasAttribute('data-lumen-booking');
      var payload = {
        name: pick(['name', 'fullname', 'full_name', 'your-name']),
        contact: pick(['phone', 'tel', 'mobile', 'email', 'contact', 'number']),
        message: pick(['message', 'enquiry', 'inquiry', 'details', 'comments', 'notes']),
        page: location.pathname,
        kind: booking ? 'booking' : 'enquiry',
        service: pick(['service', 'treatment', 'course', 'class']),
        preferred_date: pick(['preferred_date', 'date', 'day']),
        preferred_time: pick(['preferred_time', 'time', 'slot']),
        website: String(data.get('website') || '')
      };

      // What the owner reads on WhatsApp. Built here rather than on the server
      // so the customer sees it before they send it, and can change it.
      var lines = [];
      if (payload.service) lines.push('For: ' + payload.service);
      if (payload.preferred_date) {
        lines.push('When: ' + payload.preferred_date + (payload.preferred_time ? ' at ' + payload.preferred_time : ''));
      }
      if (payload.name) lines.push('Name: ' + payload.name);
      if (payload.contact) lines.push('Contact: ' + payload.contact);
      if (payload.message) lines.push(payload.message);
      var summary = (booking ? 'Booking request' : 'Enquiry') + ' from your website\n' + lines.join('\n');

      // Nowhere to send it — a preview, or a site exported elsewhere. Saying
      // "we will be in touch" would be a lie, so it says what to do instead.
      if (!endpoint) {
        if (status) status.textContent = 'This form is not connected yet. Please call or message us directly.';
        return;
      }

      var button = form.querySelector('button[type="submit"], input[type="submit"]');
      if (button) button.disabled = true;
      if (status) status.textContent = 'Sending…';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) throw new Error('failed');
          form.reset();
          if (status) {
            status.textContent = booking
              ? 'Thank you — we have your request and will confirm shortly.'
              : 'Thank you — we have your message and will be in touch.';
          }
          // Filed first, then handed over. The order matters: if the customer
          // never finishes sending the WhatsApp message, the owner still has
          // the enquiry.
          if (handoff) {
            if (status) status.textContent += ' Opening WhatsApp…';
            window.open(handoff + (handoff.indexOf('?') === -1 ? '?' : '&') + 'text=' + encodeURIComponent(summary), '_blank', 'noopener');
          }
        })
        .catch(function () {
          // Never a silent success. If it did not send, they need to know now,
          // while they are still on the page and can ring instead.
          if (status) status.textContent = 'That did not send. Please call or message us directly.';
        })
        .then(function () {
          if (button) button.disabled = false;
        });
    });
  });

  document.querySelectorAll('[data-lumen-year]').forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });
})();
${PREMIUM_SCRIPT}
`;

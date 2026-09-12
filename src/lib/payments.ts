/**
 * Taking money on a generated site, the way a small business actually can.
 *
 * Not a checkout integration: Lumen holds no keys, creates no orders and never
 * sits between a customer and a business's bank. The owner makes a payment link
 * in the app they already use — Razorpay, Stripe, PayPal, a UPI link — and
 * Lumen puts a button on the site that points at it. That is one paste, in a
 * dashboard they already have, instead of an API key and a webhook.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

export const DEFAULT_PAY_LABEL = 'Pay now';

/**
 * Accepts a payment link, or nothing.
 *
 * https only, plus upi: — which is how half of India pays and which opens the
 * customer's own app. Everything else, javascript: most of all, is refused:
 * this value ends up in an href on a page we serve to the public.
 */
export function normalisePaymentUrl(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (text.length > 600) return null;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }

  if (url.protocol === 'https:') return url.toString();
  if (url.protocol === 'upi:') return url.toString();
  return null;
}

export function normalisePayLabel(value: string | null | undefined): string {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 40) : DEFAULT_PAY_LABEL;
}

/**
 * Adds the button to a page at serve time, the same way the assistant is added.
 *
 * It goes into the site's own nav when there is one, so it looks like part of
 * the design rather than something bolted on. Sites that predate the component
 * library have no nav to speak of, and get a floating button on the opposite
 * corner from the chat bubble instead of nothing.
 */
export function withPayButton(
  html: string,
  url: string | null,
  label: string | null | undefined,
): string {
  if (!url || html.includes('data-lumen-pay')) return html;

  const href = escapeHtml(url);
  const text = escapeHtml(normalisePayLabel(label));
  const anchor = `<a class="btn" data-lumen-pay href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;

  const navMatch = /(<nav\b[^>]*id=["']site-nav["'][^>]*>)([\s\S]*?)(<\/nav>)/i;
  if (navMatch.test(html)) {
    return html.replace(navMatch, (_whole, open: string, inner: string, close: string) => {
      return `${open}${inner}${anchor}${close}`;
    });
  }

  const floating = `<style>[data-lumen-pay]{position:fixed;left:20px;bottom:20px;z-index:2147482000;padding:.8rem 1.4rem;border-radius:999px;background:#111;color:#fff;text-decoration:none;font:600 14px/1 system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)}</style>`;
  const block = `${floating}${anchor}`;
  return html.includes('</body>') ? html.replace(/<\/body>/i, `${block}\n</body>`) : html + block;
}

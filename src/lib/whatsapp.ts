import { escapeHtml } from '@/lib/generation/kit/sections';

/**
 * WhatsApp, which in India is not a nice-to-have but the channel.
 *
 * Click-to-chat, which needs no API, no approval and no Business account: a
 * wa.me link opens the app with the message already typed. That is how a
 * customer already talks to a shop, and it is the difference between an
 * enquiry and a conversation.
 */

/** Digits only, country code included, as wa.me demands. */
export function normaliseWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length < 8 || digits.length > 15) return null;
  // Ten digits with no country code is an Indian mobile: the alternative is a
  // link that silently opens a chat with nobody.
  return digits.length === 10 ? `91${digits}` : digits;
}

export function whatsappHref(number: string, message?: string | null): string {
  const text = message?.trim();
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text.slice(0, 600))}` : ''}`;
}

export const DEFAULT_WHATSAPP_MESSAGE = 'Hi! I found you on your website and wanted to ask about';

/**
 * The floating button, added where the site is served.
 *
 * Bottom right unless the assistant is already there, in which case it sits
 * above it — two circles stacked in one corner is better than two circles on
 * top of each other.
 */
export function withWhatsApp(
  html: string,
  number: string | null,
  message: string | null,
): string {
  if (!number || html.includes('data-lumen-whatsapp')) return html;

  const href = escapeHtml(whatsappHref(number, message));
  const stacked = html.includes('data-lumen-chat') || html.includes('lumen-chat');
  const bottom = stacked ? '92px' : '20px';

  const style =
    `<style>[data-lumen-whatsapp]{position:fixed;right:20px;bottom:${bottom};z-index:2147482000;` +
    `display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:999px;` +
    `background:#25D366;box-shadow:0 10px 30px rgba(0,0,0,.25);text-decoration:none}` +
    `[data-lumen-whatsapp] svg{width:30px;height:30px;fill:#fff}` +
    `@media print{[data-lumen-whatsapp]{display:none}}</style>`;

  const anchor =
    `<a data-lumen-whatsapp href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">` +
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 8.22 8.24c0 4.54-3.7 8.22-8.23 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.85.84-.85 2.04s.87 2.37 1 2.53c.12.17 1.71 2.6 4.14 3.65.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z"/></svg></a>`;

  const block = `${style}${anchor}`;
  return html.includes('</body>') ? html.replace(/<\/body>/i, `${block}\n</body>`) : html + block;
}

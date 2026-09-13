import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { liveChatbotKey, withChatbot } from '@/lib/chatbot-embed';
import { withPayButton } from '@/lib/payments';

/**
 * The things a site gains after it is built, added where it is served.
 *
 * The assistant and the payment button are switched on in Lumen and appear on
 * the site — the preview and the published address both. Nothing is baked into
 * the generated files, so turning either one off takes it away again without
 * regenerating anything, and a site exported to hosting elsewhere is still the
 * plain HTML it always was.
 */

export interface SiteExtras {
  chatbotKey: string | null;
  paymentUrl: string | null;
  paymentLabel: string | null;
}

export const NO_EXTRAS: SiteExtras = { chatbotKey: null, paymentUrl: null, paymentLabel: null };

export async function loadSiteExtras(
  projectId: string,
  options: { chatbot?: boolean } = {},
): Promise<SiteExtras> {
  const [chatbotKey, payment] = await Promise.all([
    options.chatbot === false ? Promise.resolve(null) : liveChatbotKey(projectId).catch(() => null),
    loadPaymentLink(projectId),
  ]);

  return { chatbotKey, paymentUrl: payment.url, paymentLabel: payment.label };
}

/**
 * Allowed to come back empty: the payment columns arrive in migration 0009, and
 * a database that has not run it should serve the site rather than fail.
 */
async function loadPaymentLink(
  projectId: string,
): Promise<{ url: string | null; label: string | null }> {
  const { data } = await createAdminClient()
    .from('projects')
    .select('payment_url, payment_label')
    .eq('id', projectId)
    .maybeSingle();

  const url = typeof data?.payment_url === 'string' ? data.payment_url : null;
  const label = typeof data?.payment_label === 'string' ? data.payment_label : null;
  return { url, label };
}

export function decorate(html: string, extras: SiteExtras): string {
  return withChatbot(withPayButton(html, extras.paymentUrl, extras.paymentLabel), extras.chatbotKey);
}

/**
 * Rewrites a page's own relative links so it works at /s/<slug> as well as
 * /s/<slug>/.
 *
 * A generated page refers to itself the way a folder of files does —
 * `styles.css`, `about.html` — which a browser resolves against the directory
 * of the current URL. At /s/neurachat that directory is /s/, so the stylesheet
 * 404s and every nav link goes nowhere.
 *
 * Redirecting to the trailing slash was the obvious fix and was wrong: Next
 * strips trailing slashes by default, so the two redirects fought each other
 * and the published site died with ERR_TOO_MANY_REDIRECTS. Making the links
 * absolute settles it in the page itself, with nothing to bounce against.
 *
 * Only bare relative paths are touched. Anything with a scheme, a leading
 * slash, or a fragment already means what it says.
 */
export function absolutise(html: string, prefix: string): string {
  return html.replace(
    /\b(href|src)=("|')([^"'>]*)\2/gi,
    (whole: string, attribute: string, quote: string, value: string) => {
      const target = value.trim();
      if (!target) return whole;
      if (/^([a-z][a-z0-9+.-]*:|\/\/|\/|#|\?)/i.test(target)) return whole;
      return `${attribute}=${quote}${prefix}${target.replace(/^\.\//, '')}${quote}`;
    },
  );
}

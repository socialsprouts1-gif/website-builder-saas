import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { liveChatbotKey, withChatbot } from '@/lib/chatbot-embed';
import { withPayButton } from '@/lib/payments';
import { normaliseWhatsApp, withWhatsApp } from '@/lib/whatsapp';
import { cleanServices, withBooking, type BookingConfig, NO_BOOKING } from '@/lib/booking';

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
  whatsappNumber: string | null;
  whatsappMessage: string | null;
  /** Hand the enquiry to WhatsApp as well as filing it. */
  whatsappLeads: boolean;
  booking: BookingConfig;
}

export const NO_EXTRAS: SiteExtras = {
  chatbotKey: null,
  paymentUrl: null,
  paymentLabel: null,
  whatsappNumber: null,
  whatsappMessage: null,
  whatsappLeads: false,
  booking: NO_BOOKING,
};

export async function loadSiteExtras(
  projectId: string,
  options: { chatbot?: boolean } = {},
): Promise<SiteExtras> {
  const [chatbotKey, settings] = await Promise.all([
    options.chatbot === false ? Promise.resolve(null) : liveChatbotKey(projectId).catch(() => null),
    loadSiteSettings(projectId),
  ]);

  return { chatbotKey, ...settings };
}

/**
 * Everything switched on after the build, read in one go.
 *
 * Allowed to come back empty at every step: these columns arrive across
 * migrations 0009 and 0013, and a database that has not run one of them should
 * serve the customer their page rather than fail in their face. So the select
 * is attempted whole and falls back to the older shape rather than throwing.
 */
async function loadSiteSettings(projectId: string): Promise<Omit<SiteExtras, 'chatbotKey'>> {
  const admin = createAdminClient();
  const empty = {
    paymentUrl: null,
    paymentLabel: null,
    whatsappNumber: null,
    whatsappMessage: null,
    whatsappLeads: false,
    booking: NO_BOOKING,
  };

  const { data, error } = await admin
    .from('projects')
    .select(
      'payment_url, payment_label, whatsapp_number, whatsapp_message, whatsapp_leads, booking_enabled, booking_services, booking_note',
    )
    .eq('id', projectId)
    .maybeSingle();

  if (error || !data) {
    // Migration 0013 is not in yet. The payment link predates it and still is.
    const { data: older } = await admin
      .from('projects')
      .select('payment_url, payment_label')
      .eq('id', projectId)
      .maybeSingle();

    return {
      ...empty,
      paymentUrl: typeof older?.payment_url === 'string' ? older.payment_url : null,
      paymentLabel: typeof older?.payment_label === 'string' ? older.payment_label : null,
    };
  }

  return {
    paymentUrl: typeof data.payment_url === 'string' ? data.payment_url : null,
    paymentLabel: typeof data.payment_label === 'string' ? data.payment_label : null,
    whatsappNumber: normaliseWhatsApp(data.whatsapp_number),
    whatsappMessage: typeof data.whatsapp_message === 'string' ? data.whatsapp_message : null,
    whatsappLeads: data.whatsapp_leads === true,
    booking: {
      enabled: data.booking_enabled === true,
      services: cleanServices(data.booking_services),
      note: typeof data.booking_note === 'string' ? data.booking_note : null,
    },
  };
}

export function decorate(html: string, extras: SiteExtras, path = ''): string {
  // Booking first, so the section is on the page before the buttons that float
  // over it are measured against what is already in the corner.
  const withForm = withBooking(html, extras.booking, /contact/i.test(path));
  const withChat = withChatbot(
    withPayButton(withForm, extras.paymentUrl, extras.paymentLabel),
    extras.chatbotKey,
  );
  return withWhatsApp(withChat, extras.whatsappNumber, extras.whatsappMessage);
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

/**
 * Recognising "connect something" in a sentence someone typed at the chat box.
 *
 * The chat is for changing the website, so "connect a payment gateway" used to
 * be handed to the model, which would dutifully write a fake Pay button into
 * the HTML. What the person actually wants is a short guided exchange — which
 * provider, then the key — and that is a UI, not a paragraph.
 *
 * Detection is deterministic rather than a model call: it has to be instant, it
 * has to be free, and being wrong occasionally is fine because the card it
 * opens always offers "no, change the website instead".
 */

export type IntentGroup =
  | 'payments'
  | 'chatbot'
  | 'hosting'
  | 'domain'
  | 'analytics'
  | 'marketing'
  | 'content';

export interface ConnectIntent {
  group: IntentGroup;
  /** The question the card leads with. */
  title: string;
  /** Provider ids to offer first, in order. */
  providers: string[];
}

/**
 * Two of these are not registry connectors. They are the things Lumen does
 * itself, and they belong in the same list because from the user's side "add a
 * chatbot" and "connect Stripe" are the same kind of request.
 */
export const BUILT_IN_PROVIDERS = {
  chatbot: 'lumen_chatbot',
  paymentLink: 'lumen_payment_link',
} as const;

interface Rule {
  group: IntentGroup;
  title: string;
  providers: string[];
  /** Any of these in the sentence puts it in this group. */
  topic: RegExp;
}

const RULES: Rule[] = [
  {
    group: 'payments',
    title: 'How do you want to take payments?',
    providers: [BUILT_IN_PROVIDERS.paymentLink, 'razorpay_checkout', 'stripe', 'booking', 'shopify'],
    topic:
      /\b(payment|payments|pay ?gateway|payment ?gateway|razor ?pay|razorpay|stripe|paypal|upi|checkout|take money|accept (money|card|payment)|deposit)\b/i,
  },
  {
    group: 'chatbot',
    title: 'Add an assistant to the site?',
    providers: [BUILT_IN_PROVIDERS.chatbot],
    topic: /\b(chat ?bot|chatbot|ai assistant|live chat|chat widget|chat bubble)\b/i,
  },
  {
    group: 'hosting',
    title: 'Where do you want it hosted?',
    providers: ['vercel', 'netlify', 'github'],
    topic: /\b(deploy|hosting|host it|vercel|netlify|github|git ?hub|push (it )?to git)\b/i,
  },
  {
    group: 'domain',
    title: 'Which domain do you want to use?',
    providers: ['custom_domain'],
    topic: /\b(domain|dns|godaddy|namecheap|cname|custom url)\b/i,
  },
  {
    group: 'analytics',
    title: 'Which analytics do you use?',
    providers: ['google_analytics'],
    topic: /\b(analytics|google ?analytics|ga4|track (visitors|traffic)|visitor stats)\b/i,
  },
  {
    group: 'marketing',
    title: 'Which tool do you want it wired into?',
    providers: ['mailchimp', 'hubspot', 'slack', 'zapier'],
    topic:
      /\b(mailchimp|hubspot|slack|zapier|crm|newsletter|mailing list|email list|subscribers|leads go)\b/i,
  },
  {
    group: 'content',
    title: 'Where is the content coming from?',
    providers: ['notion', 'airtable', 'google_sheets'],
    topic: /\b(notion|airtable|google ?sheets?|spreadsheet as)\b/i,
  },
];

/** The words that make a sentence a request to wire something up. */
const ACTION =
  /\b(connect|connecting|integrate|integration|integrations|set ?up|setup|add|enable|link|hook ?up|configure|wire|accept|start taking)\b/i;

/**
 * The same request phrased as a question. People do not say "connect Razorpay"
 * as often as "how do I take card payments here".
 */
const ASKING =
  /\b(how (do|can|would) (i|we)|can (you|i|we)|could you|i want|i need|i'd like|is there a way|help me|please)\b/i;

/**
 * Words that mean the sentence is about the page, not about an integration.
 *
 * "add a payments section to the homepage" is a site edit that happens to
 * contain the word payments, and hijacking it would be worse than missing it.
 */
const ABOUT_THE_PAGE =
  /\b(section|heading|headline|paragraph|copy|text|wording|colour|color|font|image|photo|button text|layout|page about|write|rewrite|change the (text|colour|color|font))\b/i;

export function detectConnectIntent(message: string): ConnectIntent | null {
  const text = message.trim();
  if (!text || text.length > 400) return null;
  if (ABOUT_THE_PAGE.test(text)) return null;

  for (const rule of RULES) {
    if (!rule.topic.test(text)) continue;

    // Either it reads as an instruction to connect something, or it is short
    // enough to be someone simply naming the thing ("razorpay", "add chatbot").
    const wordCount = text.split(/\s+/).length;
    if (!ACTION.test(text) && !ASKING.test(text) && wordCount > 4) continue;

    return { group: rule.group, title: rule.title, providers: rule.providers };
  }

  return null;
}

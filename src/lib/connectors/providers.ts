import { env } from '@/lib/env';
import { apiKeyConnector, oauthConnector } from './factory';
import type { Connector, ConnectorSyncResult } from './types';

/**
 * Every integration Lumen ships. Adding one is a new entry here — the settings
 * and project connector pages render whatever this list contains.
 */

async function jsonFetch(
  url: string,
  init: RequestInit,
  okMessage: string,
  failMessage: string,
): Promise<ConnectorSyncResult> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      return { ok: false, message: `${failMessage} (HTTP ${response.status})` };
    }
    return { ok: true, message: okMessage };
  } catch {
    return { ok: false, message: `${failMessage} — could not reach the service.` };
  }
}

// ---------------------------------------------------------------- deploy ----

const github = oauthConnector({
  provider: 'github',
  name: 'GitHub',
  category: 'deploy',
  summary: 'Push a generated site to a repository you own.',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  scopes: ['repo', 'user:email'],
  envKey: 'GITHUB',
  clientId: env.connectors.github.id,
  clientSecret: env.connectors.github.secret,
  verify: async (token) =>
    jsonFetch(
      'https://api.github.com/user',
      { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' } },
      'GitHub connected.',
      'GitHub rejected that token',
    ),
});

const vercel = oauthConnector({
  provider: 'vercel',
  name: 'Vercel',
  category: 'deploy',
  summary: 'One-click deploy of any project to your Vercel account.',
  authorizeUrl: 'https://vercel.com/oauth/authorize',
  tokenUrl: 'https://api.vercel.com/v2/oauth/access_token',
  scopes: [],
  envKey: 'VERCEL',
  clientId: env.connectors.vercel.id,
  clientSecret: env.connectors.vercel.secret,
  verify: async (token) =>
    jsonFetch(
      'https://api.vercel.com/v2/user',
      { headers: { authorization: `Bearer ${token}` } },
      'Vercel connected.',
      'Vercel rejected that token',
    ),
});

const netlify = apiKeyConnector({
  provider: 'netlify',
  name: 'Netlify',
  category: 'deploy',
  summary: 'Deploy a generated site to Netlify with a personal access token.',
  fields: [
    { name: 'access_token', label: 'Personal access token', secret: true, help: 'Netlify → User settings → Applications.' },
  ],
  verify: async (credentials) =>
    jsonFetch(
      'https://api.netlify.com/api/v1/user',
      { headers: { authorization: `Bearer ${credentials.access_token}` } },
      'Netlify connected.',
      'Netlify rejected that token',
    ),
});

const customDomain = apiKeyConnector({
  provider: 'custom_domain',
  name: 'Custom domain',
  category: 'deploy',
  scope: 'project',
  summary: 'Point your own domain at a deployed site.',
  fields: [{ name: 'domain', label: 'Domain', placeholder: 'yourbusiness.in' }],
  verify: async (credentials) => {
    const domain = credentials.domain.trim().toLowerCase();
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
      return { ok: false, message: 'That does not look like a domain name.' };
    }
    return {
      ok: true,
      message: `Saved. Add a CNAME for ${domain} pointing at your deploy target, then verify.`,
    };
  },
});

// -------------------------------------------------------- business tools ----

const googleAnalytics = apiKeyConnector({
  provider: 'google_analytics',
  name: 'Google Analytics',
  category: 'business',
  summary: 'Inject your measurement ID into every generated page.',
  fields: [{ name: 'measurement_id', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX' }],
  verify: async (credentials) =>
    /^G-[A-Z0-9]{6,}$/i.test(credentials.measurement_id.trim())
      ? { ok: true, message: 'Analytics connected. New deploys carry the tag.' }
      : { ok: false, message: 'A measurement ID looks like G-XXXXXXXXXX.' },
});

const mailchimp = apiKeyConnector({
  provider: 'mailchimp',
  name: 'Mailchimp',
  category: 'business',
  summary: 'Send contact-form submissions to a mailing list.',
  fields: [
    { name: 'api_key', label: 'API key', secret: true, help: 'Ends in -us1, -us2 and so on.' },
    { name: 'list_id', label: 'Audience ID', placeholder: 'a1b2c3d4e5' },
  ],
  verify: async (credentials) => {
    const datacenter = credentials.api_key.split('-')[1];
    if (!datacenter) return { ok: false, message: 'That key is missing its -usX suffix.' };
    return jsonFetch(
      `https://${datacenter}.api.mailchimp.com/3.0/lists/${credentials.list_id}`,
      { headers: { authorization: `Bearer ${credentials.api_key}` } },
      'Mailchimp connected.',
      'Mailchimp rejected those details',
    );
  },
});

const zapier = apiKeyConnector({
  provider: 'zapier',
  name: 'Zapier',
  category: 'business',
  summary: 'Fire a webhook on every form submission or booking.',
  fields: [
    { name: 'webhook_url', label: 'Catch hook URL', placeholder: 'https://hooks.zapier.com/hooks/catch/…' },
  ],
  verify: async (credentials) =>
    credentials.webhook_url.startsWith('https://hooks.zapier.com/')
      ? { ok: true, message: 'Zapier connected.' }
      : { ok: false, message: 'That is not a Zapier catch-hook URL.' },
  sync: async (context) => {
    const url = context.credentials?.webhook_url;
    if (!url) return { ok: false, message: 'Not connected.' };
    return jsonFetch(
      url,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: 'lumen', event: 'test', at: new Date().toISOString() }),
      },
      'Test event sent — check your Zap.',
      'Zapier did not accept the test event',
    );
  },
});

const hubspot = oauthConnector({
  provider: 'hubspot',
  name: 'HubSpot',
  category: 'business',
  summary: 'Sync leads captured on your site into HubSpot.',
  authorizeUrl: 'https://app.hubspot.com/oauth/authorize',
  tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
  scopes: ['crm.objects.contacts.write', 'crm.objects.contacts.read'],
  envKey: 'HUBSPOT',
  clientId: env.connectors.hubspot.id,
  clientSecret: env.connectors.hubspot.secret,
});

const slack = oauthConnector({
  provider: 'slack',
  name: 'Slack',
  category: 'business',
  summary: 'Get a message in a channel on every new enquiry or booking.',
  authorizeUrl: 'https://slack.com/oauth/v2/authorize',
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  scopes: ['chat:write', 'incoming-webhook'],
  envKey: 'SLACK',
  clientId: env.connectors.slack.id,
  clientSecret: env.connectors.slack.secret,
});

// ------------------------------------------------------- content sources ----

const notion = oauthConnector({
  provider: 'notion',
  name: 'Notion',
  category: 'content',
  summary: 'Drive a page section from a Notion database.',
  authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
  tokenUrl: 'https://api.notion.com/v1/oauth/token',
  scopes: [],
  envKey: 'NOTION',
  clientId: env.connectors.notion.id,
  clientSecret: env.connectors.notion.secret,
});

const airtable = apiKeyConnector({
  provider: 'airtable',
  name: 'Airtable',
  category: 'content',
  summary: 'Keep a menu or price list in a base and have the site follow it.',
  fields: [
    { name: 'api_key', label: 'Personal access token', secret: true },
    { name: 'base_id', label: 'Base ID', placeholder: 'appXXXXXXXXXXXXXX' },
    { name: 'table_name', label: 'Table name', placeholder: 'Menu' },
  ],
  verify: async (credentials) =>
    jsonFetch(
      `https://api.airtable.com/v0/${credentials.base_id}/${encodeURIComponent(credentials.table_name)}?maxRecords=1`,
      { headers: { authorization: `Bearer ${credentials.api_key}` } },
      'Airtable connected.',
      'Airtable rejected those details',
    ),
});

const googleSheets = oauthConnector({
  provider: 'google_sheets',
  name: 'Google Sheets',
  category: 'content',
  summary: 'Edit a price list in a spreadsheet; the site picks up the change.',
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  envKey: 'GOOGLE',
  clientId: env.connectors.google.id,
  clientSecret: env.connectors.google.secret,
});

// -------------------------------------------------- commerce and bookings ----

const razorpayCheckout = apiKeyConnector({
  provider: 'razorpay_checkout',
  name: 'Razorpay checkout',
  category: 'commerce',
  scope: 'project',
  summary: 'Take payments or booking deposits on the generated site.',
  fields: [
    { name: 'key_id', label: 'Key ID', placeholder: 'rzp_live_…' },
    { name: 'key_secret', label: 'Key secret', secret: true },
  ],
  verify: async (credentials) =>
    credentials.key_id.startsWith('rzp_')
      ? { ok: true, message: 'Razorpay checkout connected.' }
      : { ok: false, message: 'A Razorpay key ID starts with rzp_.' },
});

const stripe = apiKeyConnector({
  provider: 'stripe',
  name: 'Stripe checkout',
  category: 'commerce',
  scope: 'project',
  summary: 'Take card payments internationally.',
  fields: [{ name: 'secret_key', label: 'Secret key', secret: true, placeholder: 'sk_live_…' }],
  verify: async (credentials) =>
    jsonFetch(
      'https://api.stripe.com/v1/account',
      { headers: { authorization: `Bearer ${credentials.secret_key}` } },
      'Stripe connected.',
      'Stripe rejected that key',
    ),
});

const shopify = apiKeyConnector({
  provider: 'shopify',
  name: 'Shopify',
  category: 'commerce',
  scope: 'project',
  summary: 'Embed an existing Shopify catalogue in a generated storefront section.',
  fields: [
    { name: 'shop_domain', label: 'Shop domain', placeholder: 'your-shop.myshopify.com' },
    { name: 'storefront_token', label: 'Storefront access token', secret: true },
  ],
  verify: async (credentials) =>
    credentials.shop_domain.endsWith('.myshopify.com')
      ? { ok: true, message: 'Shopify connected.' }
      : { ok: false, message: 'Use your full your-shop.myshopify.com domain.' },
});

const booking = apiKeyConnector({
  provider: 'booking',
  name: 'Bookings',
  category: 'commerce',
  scope: 'project',
  summary: 'A simple reservation form on the site, written straight to your project.',
  fields: [
    { name: 'notify_email', label: 'Notify this address', placeholder: 'bookings@yourbusiness.in' },
  ],
  verify: async (credentials) =>
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(credentials.notify_email.trim())
      ? { ok: true, message: 'Bookings enabled.' }
      : { ok: false, message: 'That is not a valid email address.' },
});

export const CONNECTORS: Connector[] = [
  github,
  vercel,
  netlify,
  customDomain,
  googleAnalytics,
  mailchimp,
  zapier,
  hubspot,
  slack,
  notion,
  airtable,
  googleSheets,
  razorpayCheckout,
  stripe,
  shopify,
  booking,
];

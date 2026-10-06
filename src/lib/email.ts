import 'server-only';
import { env } from '@/lib/env';
import { logError } from '@/lib/errors';

/**
 * Sending an email, when there is anything to send it with.
 *
 * One provider, over plain HTTP, with no SDK: it is a POST with a JSON body,
 * and a dependency that has to be kept in step with a framework is a poor trade
 * for saving ten lines. Resend because its free tier covers a product at this
 * size and its API is one endpoint.
 *
 * Nothing here ever throws. An email is a courtesy on top of something that has
 * already worked — a site that was built is built whether or not the owner gets
 * told by email — so a provider outage must not turn a successful build into a
 * failed one. It is logged and dropped.
 */

const ENDPOINT = 'https://api.resend.com/emails';

export const isEmailConfigured = Boolean(env.email.apiKey && env.email.from);

export interface Email {
  to: string;
  subject: string;
  /** Plain text. Every client renders it, and nobody reads the HTML anyway. */
  text: string;
  html?: string;
}

export async function sendEmail(message: Email): Promise<boolean> {
  if (!isEmailConfigured) return false;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.email.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.email.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
      // A build should not be held up by somebody else's mail queue.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      await logError({
        scope: 'email.send',
        error: new Error(`Mail provider returned ${response.status}`),
        detail: { subject: message.subject },
      });
      return false;
    }
    return true;
  } catch (cause) {
    await logError({ scope: 'email.send', error: cause, detail: { subject: message.subject } });
    return false;
  }
}

/**
 * "Your website is ready."
 *
 * Written as the one line somebody reads on a phone notification, then the
 * link. No preamble, no marketing, nothing to scroll past: the whole purpose of
 * this email is the URL, and burying it under a paragraph about how excited we
 * are is how it gets ignored.
 */
export function builtEmail(params: { name: string; url: string }): Omit<Email, 'to'> {
  const name = params.name.trim() || 'Your website';

  return {
    subject: `${name} is ready`,
    text: [
      `${name} is built and waiting for you.`,
      '',
      `Open it here: ${params.url}`,
      '',
      'Everything on it can be changed by saying what you want — the pages, the words, the colours.',
      '',
      '— Lumen',
    ].join('\n'),
    html: [
      `<p style="font-size:17px;margin:0 0 16px"><strong>${escape(name)}</strong> is built and waiting for you.</p>`,
      `<p style="margin:0 0 20px"><a href="${escape(params.url)}" style="background:#d7ff3e;color:#0a0a08;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">Open your site</a></p>`,
      '<p style="font-size:15px;color:#555;margin:0">Everything on it can be changed by saying what you want — the pages, the words, the colours.</p>',
      '<p style="font-size:15px;color:#555;margin:20px 0 0">— Lumen</p>',
    ].join(''),
  };
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

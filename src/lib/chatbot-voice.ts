import 'server-only';
import { resolveApiKey } from '@/lib/openai/client';
import { decryptSecret } from '@/lib/crypto';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * The voice agent: a visitor talking to the site's assistant out loud.
 *
 * Built on OpenAI's Realtime API over WebRTC, and the shape of that matters
 * because it decides what this file can and cannot do. The browser holds the
 * audio connection directly with OpenAI — that is the only way to get
 * conversational latency, since routing audio through Lumen would add a round
 * trip to every syllable. But the browser must never hold the API key.
 *
 * So this mints an *ephemeral* session token: a credential that is valid for
 * about a minute, only for creating one realtime session, and is useless to
 * anybody who scrapes it off the page afterwards. The real key never leaves
 * the server.
 *
 * Voice is the owner's own key only, deliberately. A spoken conversation is
 * open-ended — there is no "ten replies" to count when somebody can talk for
 * four minutes — and metering it fairly would mean billing by the second,
 * which is a product decision nobody has made. So the free allowance stays
 * with text, and voice is something a site turns on with its own key.
 */

export const REALTIME_MODEL = 'gpt-realtime';

export interface VoiceSession {
  /** The short-lived credential the browser uses, and nothing more. */
  clientSecret: string;
  expiresAt: number;
  model: string;
  voice: string;
}

export { VOICES, isVoiceId, type VoiceId } from './chatbot-voice.shared';
import type { VoiceId } from './chatbot-voice.shared';

/**
 * The instructions the voice agent speaks under.
 *
 * Deliberately stricter than the text assistant's. A wrong sentence typed into
 * a chat bubble can be re-read and doubted; the same sentence spoken aloud in a
 * confident voice is believed. So it is told, in as many words, to say it does
 * not know rather than to fill the silence.
 */
export function voiceInstructions(params: {
  businessName: string;
  tone: string;
  knowledge: string;
}): string {
  return [
    `You are the voice assistant for ${params.businessName}. You are speaking out loud to a visitor on their website.`,
    `Tone: ${params.tone}.`,
    'Keep every answer to one or two sentences. This is speech, not writing — a paragraph read aloud is unbearable.',
    'Answer only from what you are told below. If the answer is not there, say you do not know and offer to take a message or point them at the contact details. Never guess a price, an opening time, a delivery date or a policy.',
    'Do not spell out URLs or email addresses unless you are asked for them.',
    '',
    'What you know about this business:',
    params.knowledge.slice(0, 12_000),
  ].join('\n');
}

/**
 * Mints the browser's short-lived credential.
 *
 * Throws rather than returning null on a missing key: the caller turns that
 * into a clear message for the owner, and a voice button that silently does
 * nothing is worse than one that explains itself.
 */
export async function mintVoiceSession(params: {
  chatbotId: string;
  userId: string;
  instructions: string;
  voice: VoiceId;
}): Promise<VoiceSession> {
  const admin = createAdminClient();
  const { data: chatbot } = await admin
    .from('chatbots')
    .select('own_key_cipher')
    .eq('id', params.chatbotId)
    .maybeSingle();

  // The owner's own key, or — only if they have none and Lumen has one —
  // the platform key. A site that wants voice is expected to bring a key;
  // this is the fallback so the founder can try it on their own sites.
  let apiKey: string;
  if (chatbot?.own_key_cipher) {
    apiKey = decryptSecret(chatbot.own_key_cipher);
  } else {
    const resolved = await resolveApiKey(params.userId, 'chatbot_reply');
    apiKey = resolved.apiKey;
  }

  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: REALTIME_MODEL,
      voice: params.voice,
      instructions: params.instructions,
      modalities: ['audio', 'text'],
      // Server-side turn detection, so the visitor can simply talk rather than
      // holding a button — which is the entire difference between this feeling
      // like a phone call and feeling like a walkie-talkie.
      turn_detection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 520 },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `The voice provider refused the session (${response.status}). ${detail.slice(0, 180)}`,
    );
  }

  const payload = (await response.json()) as {
    client_secret?: { value?: string; expires_at?: number };
  };
  const secret = payload.client_secret?.value;
  if (!secret) throw new Error('The voice provider returned no session token.');

  return {
    clientSecret: secret,
    expiresAt: payload.client_secret?.expires_at ?? Math.floor(Date.now() / 1000) + 60,
    model: REALTIME_MODEL,
    voice: params.voice,
  };
}

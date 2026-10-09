import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isVoiceId, mintVoiceSession, voiceInstructions } from '@/lib/chatbot-voice';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { noteError } from '@/lib/errors';

export const runtime = 'nodejs';
export const maxDuration = 30;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * Hands the widget a one-minute credential for a spoken conversation.
 *
 * Reachable from any origin, because the widget runs on the customer's own
 * domain — so it is rate limited hard per embed key. A scraped key must not be
 * turnable into an unlimited supply of realtime sessions, which is the one
 * thing on this endpoint that would actually cost money.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await context.params;

  const limit = await rateLimit(
    `voice:${embedKey}`,
    RATE_LIMITS.chatbotVoice.limit,
    RATE_LIMITS.chatbotVoice.windowSeconds,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many voice sessions. Try again shortly.' },
      { status: 429, headers: CORS },
    );
  }

  const admin = createAdminClient();
  const { data: chatbot } = await admin
    .from('chatbots')
    .select('id, project_id, name, tone, is_active, voice_enabled, voice_id, faq')
    .eq('embed_key', embedKey)
    .maybeSingle();

  if (!chatbot || !chatbot.is_active || !chatbot.voice_enabled) {
    return NextResponse.json({ error: 'Voice is not available here.' }, { status: 404, headers: CORS });
  }

  const { data: project } = await admin
    .from('projects')
    .select('id, user_id, name')
    .eq('id', chatbot.project_id)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: 'Voice is not available here.' }, { status: 404, headers: CORS });
  }

  // The same passages the text assistant answers from, so the two cannot
  // disagree about the business in front of the same visitor.
  const { data: documents } = await admin
    .from('chatbot_documents')
    .select('content')
    .eq('chatbot_id', chatbot.id)
    .limit(12);

  const knowledge = [(documents ?? []).map((row) => row.content).join('\n\n'), chatbot.faq ?? '']
    .filter(Boolean)
    .join('\n\n');

  try {
    const session = await mintVoiceSession({
      chatbotId: chatbot.id,
      userId: project.user_id,
      voice: isVoiceId(chatbot.voice_id) ? chatbot.voice_id : 'alloy',
      instructions: voiceInstructions({
        businessName: project.name,
        tone: chatbot.tone,
        knowledge,
      }),
    });

    return NextResponse.json(session, { headers: CORS });
  } catch (cause) {
    noteError({ scope: 'chatbot.voice', error: cause, projectId: project.id, userId: project.user_id });
    return NextResponse.json(
      { error: 'The voice assistant could not start. Please type instead.' },
      { status: 503, headers: CORS },
    );
  }
}

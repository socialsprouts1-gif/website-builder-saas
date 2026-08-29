import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { answerVisitorQuestion } from '@/lib/chatbot';
import { chatbotAskSchema } from '@/lib/validation';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Public endpoint the embedded widget talks to. It is reachable from any origin
 * by design (the widget runs on the customer's own domain), so it is rate
 * limited per embed key — a scraped key cannot be hammered (spec Section 16).
 */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest, context: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await context.params;

  const limit = await rateLimit(
    `chatbot:${embedKey}`,
    RATE_LIMITS.chatbotPublic.limit,
    RATE_LIMITS.chatbotPublic.windowSeconds,
  );
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many messages. Try again shortly.' }, { status: 429, headers: CORS });
  }

  let body: { message: string; sessionId: string };
  try {
    body = chatbotAskSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 422, headers: CORS });
  }

  const admin = createAdminClient();
  const { data: chatbot } = await admin
    .from('chatbots')
    .select('id, project_id, name, tone, is_active')
    .eq('embed_key', embedKey)
    .maybeSingle();

  if (!chatbot || !chatbot.is_active) {
    return NextResponse.json({ error: 'This assistant is not available.' }, { status: 404, headers: CORS });
  }

  const { data: project } = await admin
    .from('projects')
    .select('id, user_id, name')
    .eq('id', chatbot.project_id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: 'This assistant is not available.' }, { status: 404, headers: CORS });
  }

  // One conversation row per visitor session, so the owner's log reads as threads.
  const { data: existingConversation } = await admin
    .from('chatbot_conversations')
    .select('id')
    .eq('chatbot_id', chatbot.id)
    .eq('visitor_session_id', body.sessionId)
    .maybeSingle();

  const conversationId =
    existingConversation?.id ??
    (
      await admin
        .from('chatbot_conversations')
        .insert({ chatbot_id: chatbot.id, visitor_session_id: body.sessionId })
        .select('id')
        .single()
    ).data?.id;

  if (!conversationId) {
    return NextResponse.json({ error: 'Could not start a conversation.' }, { status: 500, headers: CORS });
  }

  const { data: history } = await admin
    .from('chatbot_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(12);

  await admin.from('chatbot_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: body.message,
  });

  try {
    const result = await answerVisitorQuestion({
      chatbotId: chatbot.id,
      projectId: project.id,
      ownerId: project.user_id,
      botName: chatbot.name,
      businessName: project.name,
      tone: chatbot.tone,
      question: body.message,
      history: history ?? [],
    });

    await admin.from('chatbot_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: result.answer,
    });

    return NextResponse.json({ answer: result.answer }, { headers: CORS });
  } catch {
    // Never surface provider errors or quota details to a public visitor.
    return NextResponse.json(
      { answer: 'Sorry — I am not able to answer right now. Please try again in a moment.' },
      { headers: CORS },
    );
  }
}

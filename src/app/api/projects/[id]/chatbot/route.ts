import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { reindexChatbot } from '@/lib/chatbot';
import { chatbotConfigSchema } from '@/lib/validation';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** Saves the bot's configuration and rebuilds its knowledge base from the site. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const { data: project } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', projectId)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);
    if (project.status !== 'ready') return jsonError('Generate the site before building its chatbot.', 409);

    const body = chatbotConfigSchema.parse(await request.json());
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('chatbots')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();

    const patch = {
      name: body.name,
      greeting: body.greeting,
      tone: body.tone,
      is_active: body.isActive ?? true,
    };

    const { data: chatbot } = existing
      ? await admin.from('chatbots').update(patch).eq('id', existing.id).select('id, embed_key').single()
      : await admin
          .from('chatbots')
          .insert({ project_id: projectId, ...patch })
          .select('id, embed_key')
          .single();

    if (!chatbot) return jsonError('Could not save the chatbot', 500);

    const index = await reindexChatbot({
      chatbotId: chatbot.id,
      projectId,
      userId: user.id,
      faq: body.faq ?? null,
    });

    return NextResponse.json({ chatbotId: chatbot.id, embedKey: chatbot.embed_key, ...index });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

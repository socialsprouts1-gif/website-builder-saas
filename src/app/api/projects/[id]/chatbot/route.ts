import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { reindexChatbot } from '@/lib/chatbot';
import { chatbotConfigSchema } from '@/lib/validation';
import { handleRouteError, jsonError } from '@/lib/api';
import type { ChatbotRow } from '@/lib/database.types';
import { avatarById, themeById } from '@/lib/chatbot-theme';
import { isVoiceId } from '@/lib/chatbot-voice';
import { encryptSecret, last4Of } from '@/lib/crypto';
import { isOwnAsset } from '@/lib/asset-url';

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
      .eq('user_id', user.id)
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

    /**
     * Only what was sent.
     *
     * The appearance panel and the setup wizard post different subsets of this
     * form, and spreading `undefined` into an update would blank whatever the
     * other one had set — turning the theme off every time somebody renamed
     * the bot.
     */
    const patch: Partial<ChatbotRow> = {
      name: body.name,
      greeting: body.greeting,
      tone: body.tone,
      is_active: body.isActive ?? true,
      faq: body.faq ?? null,
    };
    if (body.theme !== undefined) patch.theme = themeById(body.theme).id;
    if (body.avatarPreset !== undefined) {
      patch.avatar_preset = avatarById(body.avatarPreset)?.id ?? null;
    }
    if (body.voiceEnabled !== undefined) patch.voice_enabled = body.voiceEnabled;
    if (body.voiceId !== undefined) patch.voice_id = isVoiceId(body.voiceId) ? body.voiceId : 'alloy';

    // An uploaded picture, checked on the server. A data: or javascript: URL
    // accepted here would end up inside an <img> on a stranger's website.
    if (body.avatarUrl !== undefined) {
      patch.avatar_url = body.avatarUrl && isOwnAsset(body.avatarUrl) ? body.avatarUrl : null;
    }

    // The owner's own key. Encrypted on the way in and never read back out —
    // the screen only ever shows the last four characters.
    if (body.ownKey !== undefined) {
      if (body.ownKey === null || body.ownKey === '') {
        patch.own_key_cipher = null;
        patch.own_key_hint = null;
      } else {
        patch.own_key_cipher = encryptSecret(body.ownKey);
        patch.own_key_hint = last4Of(body.ownKey);
      }
    }

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

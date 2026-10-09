import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { avatarById, themeById, themeCss } from '@/lib/chatbot-theme';
import { widgetSource } from '@/lib/chatbot-widget';

export const runtime = 'nodejs';

/**
 * The chat widget, as it ships on a published site.
 *
 * One dependency-free script, styled from the generated site's own palette and
 * the theme its owner chose — never Lumen's colours on somebody else's site.
 *
 * It was rebuilt because the first version looked like a browser dialog from
 * 2009: square bubbles, a hard-coded grey, no avatar, no open animation, and a
 * "…" where a typing indicator should be. A chat bubble is the one piece of
 * Lumen a business's own customers actually touch, so it is the last place to
 * leave something that reads as a default.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await context.params;

  const admin = createAdminClient();
  const { data: chatbot } = await admin
    .from('chatbots')
    .select('name, greeting, accent_color, is_active, theme, avatar_url, avatar_preset, voice_enabled')
    .eq('embed_key', embedKey)
    .maybeSingle();

  if (!chatbot || !chatbot.is_active) {
    return new Response('/* Lumen: this assistant is not available. */', {
      headers: { 'content-type': 'text/javascript; charset=utf-8' },
    });
  }

  const theme = themeById(chatbot.theme);
  const accent = chatbot.accent_color || '#15150f';
  const preset = avatarById(chatbot.avatar_preset);

  const config = JSON.stringify({
    endpoint: `${request.nextUrl.origin}/api/chatbot/${embedKey}`,
    name: chatbot.name,
    greeting: chatbot.greeting,
    css: themeCss(theme, accent),
    // An uploaded picture wins; otherwise the chosen face; otherwise nothing,
    // and the header is just a name, which is a legitimate choice.
    avatarUrl: chatbot.avatar_url ?? null,
    avatarSvg: preset?.svg ?? '',
    voice: Boolean(chatbot.voice_enabled),
    voiceEndpoint: `${request.nextUrl.origin}/api/chatbot/${embedKey}/voice`,
  });

  return new Response(widgetSource(config), {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'access-control-allow-origin': '*',
    },
  });
}

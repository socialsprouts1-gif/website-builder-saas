import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { reindexChatbot } from '@/lib/chatbot';
import { noteError } from '@/lib/errors';

/**
 * Gives a freshly built site an assistant that actually knows anything.
 *
 * The bug this fixes, in the words a visitor saw on a real site: "I don't have
 * any site content indexed yet, so I can't answer specific questions about the
 * business." The chat bubble ships on every generated site, and indexing only
 * ever ran when the owner opened the chatbot screen and pressed Save — which
 * almost nobody did, because nothing told them they had to. So the assistant
 * was live, in front of customers, and useless, on every site Lumen made.
 *
 * Now the build does it. The row is created with the business's own name
 * rather than "Assistant", and the index is built from the pages just written.
 *
 * Never throws. A site that is finished and good must not be marked failed
 * because an embedding call was busy — the worst case is an assistant that
 * knows nothing, which is where this started and is still a working site.
 */
export async function autoIndexChatbot(params: {
  projectId: string;
  userId: string;
  businessName: string;
}): Promise<{ chunks: number }> {
  const admin = createAdminClient();

  try {
    const { data: existing } = await admin
      .from('chatbots')
      .select('id, faq')
      .eq('project_id', params.projectId)
      .maybeSingle();

    let chatbotId = existing?.id;
    let faq = existing?.faq ?? null;

    if (!chatbotId) {
      // Named after the business, because "Assistant" on a jeweller's site is
      // the clearest possible sign that nobody configured this.
      const { data: created } = await admin
        .from('chatbots')
        .insert({
          project_id: params.projectId,
          name: params.businessName.slice(0, 40) || 'Assistant',
          greeting: `Hi! Ask me anything about ${params.businessName}.`.slice(0, 200),
          tone: 'friendly',
          is_active: true,
        })
        .select('id, faq')
        .single();

      if (!created) return { chunks: 0 };
      chatbotId = created.id;
      faq = created.faq ?? null;
    }

    const result = await reindexChatbot({
      chatbotId,
      projectId: params.projectId,
      userId: params.userId,
      faq,
    });

    await admin
      .from('chatbots')
      .update({ indexed_at: new Date().toISOString(), chunk_count: result.chunks })
      .eq('id', chatbotId);

    return { chunks: result.chunks };
  } catch (error) {
    noteError({
      scope: 'chatbot.autoindex',
      error,
      userId: params.userId,
      projectId: params.projectId,
    });
    return { chunks: 0 };
  }
}

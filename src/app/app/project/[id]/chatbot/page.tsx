import { notFound } from 'next/navigation';
import { Card, SectionHeader } from '@/components/ui/Card';
import { ChatbotBuilder } from '@/components/app/ChatbotBuilder';
import { ChatbotAppearance } from '@/components/app/ChatbotAppearance';
import { FREE_REPLIES, periodKey } from '@/lib/chatbot-allowance';
import { buildPalette, type RecipeName } from '@/lib/generation/variety/colour';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { requestOrigin } from '@/lib/request-origin';

export const metadata = { title: 'Chatbot' };
export const dynamic = 'force-dynamic';

export default async function ChatbotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Whatever domain the owner is looking at this on, so every link and
  // snippet below belongs to it rather than to a build-time guess.
  const origin = await requestOrigin();
  const user = await requireUser();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!project) notFound();

  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('id, name, greeting, tone, embed_key, is_active, theme, avatar_url, avatar_preset, voice_enabled, voice_id, own_key_hint, replies_used, replies_period, indexed_at, chunk_count')
    .eq('project_id', id)
    .maybeSingle();

  // Asked separately and allowed to fail: the error columns arrive in migration
  // 0010, and the page must open without them.
  const { data: health } = chatbot
    ? await supabase
        .from('chatbots')
        .select('last_error, last_error_at')
        .eq('id', chatbot.id)
        .maybeSingle()
    : { data: null };

  const { data: faqDocument } = chatbot
    ? await supabase
        .from('chatbot_documents')
        .select('content')
        .eq('chatbot_id', chatbot.id)
        .eq('source_type', 'faq')
        .maybeSingle()
    : { data: null };

  const conversations = chatbot ? await loadConversations(chatbot.id) : [];

  /**
   * The site's own accent, so the theme previews show what a visitor will
   * actually see rather than Lumen's colours on somebody else's brand.
   *
   * Rebuilt from the direction the site was generated in rather than read out
   * of its stylesheet: the direction is two numbers on the project row, and
   * parsing a hex out of a CSS file would mean fetching the whole site from
   * storage to render a settings page.
   */
  const { data: withDirection } = await supabase
    .from('projects')
    .select('direction')
    .eq('id', id)
    .maybeSingle();
  const direction = withDirection?.direction as { hue?: number; recipe?: string } | null;
  const accent =
    typeof direction?.hue === 'number'
      ? buildPalette(direction.hue, (direction.recipe ?? 'midnight') as RecipeName).accent
      : '#15150f';

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10">
      <SectionHeader
        title="Site chatbot"
        description={`An AI assistant for ${project.name}, answering from this site's own content.`}
      />

      {project.status !== 'ready' ? (
        <p className="rounded-card border border-hairline bg-raised px-4 py-6 text-center text-[15px] text-ink-muted">
          Generate the site first — the chatbot learns from its content.
        </p>
      ) : (
        <Card>
          {health?.last_error ? (
            <div className="mb-5 rounded-[12px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3">
              <p className="text-[14.5px] text-[#e5735a]">
                The last visitor question could not be answered.
              </p>
              {/* The visitor sees something neutral; the person who can fix it
                  sees what actually happened. */}
              <p className="mt-1.5 break-words font-mono text-[14.5px] leading-relaxed text-[#e5735a]/80">
                {health.last_error}
              </p>
              <p className="mt-2 text-[13.5px] text-ink-muted">
                {health.last_error_at
                  ? `Last seen ${new Date(health.last_error_at).toLocaleString()}. `
                  : ''}
                This clears itself as soon as the assistant answers again.
              </p>
            </div>
          ) : null}
          <ChatbotBuilder
            projectId={project.id}
            siteUrlBase={origin}
            initial={{
              name: chatbot?.name ?? 'Assistant',
              greeting: chatbot?.greeting ?? `Hi! Ask me anything about ${project.name}.`,
              tone: chatbot?.tone ?? 'friendly',
              faq: faqDocument?.content ?? '',
              embedKey: chatbot?.embed_key ?? null,
              isActive: chatbot?.is_active ?? true,
            }}
          />
        </Card>
      )}

      {/* Everything somebody comes back for once the assistant exists: how it
          looks, how it sounds, and whose key pays for it. */}
      {project.status === 'ready' && chatbot ? (
        <div className="mt-10">
          <ChatbotAppearance
            projectId={project.id}
            accent={accent}
            config={{
              name: chatbot.name,
              greeting: chatbot.greeting,
              tone: chatbot.tone,
              faq: faqDocument?.content ?? '',
              isActive: chatbot.is_active,
            }}
            initial={{
              theme: chatbot.theme ?? 'clean',
              avatarPreset: chatbot.avatar_preset ?? null,
              avatarUrl: chatbot.avatar_url ?? null,
              voiceEnabled: Boolean(chatbot.voice_enabled),
              voiceId: chatbot.voice_id ?? 'alloy',
              ownKeyHint: chatbot.own_key_hint ?? null,
              // A counter from a month that has rolled over reads as zero,
              // the same comparison the server makes when it decides.
              repliesUsed: chatbot.replies_period === periodKey() ? (chatbot.replies_used ?? 0) : 0,
              freeReplies: FREE_REPLIES,
              indexedAt: chatbot.indexed_at ?? null,
              chunkCount: chatbot.chunk_count ?? 0,
            }}
          />
        </div>
      ) : null}

      <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">What visitors are asking</h2>
      {conversations.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[15px] text-ink-muted">
          No conversations yet. They appear here once the widget is live.
        </p>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <details key={conversation.id} className="rounded-card border border-hairline bg-raised px-4 py-3">
              <summary className="cursor-pointer text-[15px] text-ink-secondary">
                {conversation.firstQuestion}
                <span className="ml-2 text-[13.5px] text-ink-muted">
                  {new Date(conversation.createdAt).toLocaleDateString('en-IN')}
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                {conversation.messages.map((message, index) => (
                  <p
                    key={index}
                    className={
                      message.role === 'user'
                        ? 'rounded-[10px] bg-accent-soft px-3 py-2 text-[14.5px] text-ink-primary'
                        : 'rounded-[10px] border border-hairline px-3 py-2 text-[14.5px] text-ink-secondary'
                    }
                  >
                    {message.content}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

async function loadConversations(chatbotId: string) {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('chatbot_conversations')
    .select('id, created_at')
    .eq('chatbot_id', chatbotId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!rows || rows.length === 0) return [];

  const { data: messages } = await supabase
    .from('chatbot_messages')
    .select('conversation_id, role, content, created_at')
    .in('conversation_id', rows.map((row) => row.id))
    .order('created_at', { ascending: true });

  return rows.map((row) => {
    const thread = (messages ?? []).filter((message) => message.conversation_id === row.id);
    return {
      id: row.id,
      createdAt: row.created_at,
      firstQuestion: thread.find((message) => message.role === 'user')?.content ?? 'Conversation',
      messages: thread.map((message) => ({ role: message.role, content: message.content })),
    };
  });
}

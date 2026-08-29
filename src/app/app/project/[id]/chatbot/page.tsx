import { notFound } from 'next/navigation';
import { Card, SectionHeader } from '@/components/ui/Card';
import { ChatbotBuilder } from '@/components/app/ChatbotBuilder';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export const metadata = { title: 'Chatbot' };
export const dynamic = 'force-dynamic';

export default async function ChatbotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('id', id)
    .maybeSingle();
  if (!project) notFound();

  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('id, name, greeting, tone, embed_key, is_active')
    .eq('project_id', id)
    .maybeSingle();

  const { data: faqDocument } = chatbot
    ? await supabase
        .from('chatbot_documents')
        .select('content')
        .eq('chatbot_id', chatbot.id)
        .eq('source_type', 'faq')
        .maybeSingle()
    : { data: null };

  const conversations = chatbot ? await loadConversations(chatbot.id) : [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <SectionHeader
        title="Site chatbot"
        description={`An AI assistant for ${project.name}, answering from this site's own content.`}
      />

      {project.status !== 'ready' ? (
        <p className="rounded-card border border-hairline bg-raised px-4 py-6 text-center text-[13px] text-ink-muted">
          Generate the site first — the chatbot learns from its content.
        </p>
      ) : (
        <Card>
          <ChatbotBuilder
            projectId={project.id}
            siteUrlBase={env.siteUrl}
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

      <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">What visitors are asking</h2>
      {conversations.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[13px] text-ink-muted">
          No conversations yet. They appear here once the widget is live.
        </p>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <details key={conversation.id} className="rounded-card border border-hairline bg-raised px-4 py-3">
              <summary className="cursor-pointer text-[13px] text-ink-secondary">
                {conversation.firstQuestion}
                <span className="ml-2 text-[11.5px] text-ink-muted">
                  {new Date(conversation.createdAt).toLocaleDateString('en-IN')}
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                {conversation.messages.map((message, index) => (
                  <p
                    key={index}
                    className={
                      message.role === 'user'
                        ? 'rounded-[10px] bg-accent-soft px-3 py-2 text-[12.5px] text-ink-primary'
                        : 'rounded-[10px] border border-hairline px-3 py-2 text-[12.5px] text-ink-secondary'
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

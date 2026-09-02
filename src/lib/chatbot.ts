import 'server-only';
import { openaiFor, resolveApiKey } from '@/lib/openai/client';
import { getModelCatalog, resolveModel } from '@/lib/openai/models';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordUsage } from '@/lib/usage';
import { chatbotSystemPrompt } from '@/lib/generation/prompts';
import { getCurrentFiles } from '@/lib/generation/storage';

/**
 * The embeddable site chatbot (spec Section 9).
 *
 * Knowledge comes from the generated site's own content by default, chunked and
 * embedded into chatbot_embeddings. Answers are hard-constrained to those
 * chunks so the bot cannot invent prices, hours or medical claims, and the
 * system prompt explicitly refuses instructions arriving inside visitor input.
 */

const CHUNK_TARGET_CHARS = 900;
const CHUNK_OVERLAP_CHARS = 120;

/** Strips markup and script/style bodies out of generated HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 2 <= CHUNK_TARGET_CHARS) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }
    if (current) chunks.push(current);
    if (paragraph.length <= CHUNK_TARGET_CHARS) {
      current = paragraph;
      continue;
    }
    // A single very long paragraph is sliced with overlap so a sentence that
    // straddles a boundary is still retrievable.
    for (let index = 0; index < paragraph.length; index += CHUNK_TARGET_CHARS - CHUNK_OVERLAP_CHARS) {
      chunks.push(paragraph.slice(index, index + CHUNK_TARGET_CHARS));
    }
    current = '';
  }

  if (current) chunks.push(current);
  return chunks.filter((chunk) => chunk.length > 40);
}

/** Rebuilds the whole knowledge base for a bot from its site plus any FAQ text. */
export async function reindexChatbot(params: {
  chatbotId: string;
  projectId: string;
  userId: string;
  faq?: string | null;
}): Promise<{ documents: number; chunks: number }> {
  const admin = createAdminClient();
  const { apiKey, source } = await resolveApiKey(params.userId, 'embedding');
  const catalog = await getModelCatalog(apiKey);
  const client = openaiFor(apiKey);

  // Replacing wholesale keeps the index consistent with the current site —
  // cascade removes the old embeddings with their documents.
  await admin.from('chatbot_documents').delete().eq('chatbot_id', params.chatbotId);

  const files = await getCurrentFiles(params.projectId);
  const documents: { source_type: 'site' | 'faq'; title: string; content: string }[] = [];

  for (const file of files) {
    if (!file.path.endsWith('.html')) continue;
    const text = htmlToText(file.content);
    if (text.length < 80) continue;
    documents.push({ source_type: 'site', title: file.path, content: text });
  }

  if (params.faq && params.faq.trim().length > 40) {
    documents.push({ source_type: 'faq', title: 'Owner FAQ', content: params.faq.trim() });
  }

  if (documents.length === 0) return { documents: 0, chunks: 0 };

  let totalChunks = 0;

  for (const document of documents) {
    const { data: inserted } = await admin
      .from('chatbot_documents')
      .insert({
        chatbot_id: params.chatbotId,
        source_type: document.source_type,
        title: document.title,
        content: document.content,
      })
      .select('id')
      .single();

    if (!inserted) continue;

    const chunks = chunkText(document.content);
    if (chunks.length === 0) continue;

    const embeddings = await client.embeddings.create({
      model: catalog.embedding,
      input: chunks,
    });

    await admin.from('chatbot_embeddings').insert(
      chunks.map((chunk, index) => ({
        document_id: inserted.id,
        chatbot_id: params.chatbotId,
        chunk_text: chunk,
        embedding: embeddings.data[index]?.embedding ?? null,
      })) as never,
    );

    totalChunks += chunks.length;

    await recordUsage({
      userId: params.userId,
      projectId: params.projectId,
      eventType: 'embedding',
      model: catalog.embedding,
      keySource: source,
      tokensIn: embeddings.usage?.prompt_tokens,
    });
  }

  return { documents: documents.length, chunks: totalChunks };
}

export interface ChatbotAnswer {
  answer: string;
  usedChunks: number;
}

/** Retrieval-augmented answer for one visitor question. */
export async function answerVisitorQuestion(params: {
  chatbotId: string;
  projectId: string;
  ownerId: string;
  botName: string;
  businessName: string;
  tone: string;
  question: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}): Promise<ChatbotAnswer> {
  const admin = createAdminClient();
  // Visitor traffic spends the site owner's credits, so it is priced too —
  // otherwise a public widget is an uncapped drain on the platform key.
  const { apiKey, source } = await resolveApiKey(params.ownerId, 'chatbot_reply');
  const catalog = await getModelCatalog(apiKey);
  const client = openaiFor(apiKey);

  const questionEmbedding = await client.embeddings.create({
    model: catalog.embedding,
    input: params.question,
  });

  const { data: matches } = await admin.rpc('match_chatbot_chunks', {
    p_chatbot_id: params.chatbotId,
    p_embedding: questionEmbedding.data[0]?.embedding as unknown as number[],
    p_limit: 6,
  });

  const chunks = (matches ?? []).map((match) => match.chunk_text);
  const context = chunks.join('\n\n---\n\n').slice(0, 12_000);

  const { model } = resolveModel(catalog, catalog.fast?.id ?? null);

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 400,
    messages: [
      {
        role: 'system',
        content: chatbotSystemPrompt({
          botName: params.botName,
          businessName: params.businessName,
          tone: params.tone,
          context: context || 'No site content has been indexed yet.',
        }),
      },
      ...params.history.slice(-6),
      { role: 'user', content: params.question },
    ],
  });

  await recordUsage({
    userId: params.ownerId,
    projectId: params.projectId,
    eventType: 'chatbot_reply',
    model,
    keySource: source,
    tokensIn: completion.usage?.prompt_tokens,
    tokensOut: completion.usage?.completion_tokens,
  });

  return {
    answer:
      completion.choices[0]?.message?.content?.trim() ??
      'Sorry — I could not find an answer to that. Would you like someone from the team to get back to you?',
    usedChunks: chunks.length,
  };
}

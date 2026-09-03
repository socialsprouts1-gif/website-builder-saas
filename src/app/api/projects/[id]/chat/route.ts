import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runChatEdit } from '@/lib/generation/pipeline';
import { chatEditSchema } from '@/lib/validation';
import { jsonError, sseEncode, sseHeaders } from '@/lib/api';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Chat-based iteration. Streams the edit as it happens, then saves a version. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Sign in first', 401);

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return jsonError('Project not found', 404);


  const limit = await rateLimitUser(
    user.id,
    `chat:${user.id}`,
    RATE_LIMITS.chatEdit.limit,
    RATE_LIMITS.chatEdit.windowSeconds,
  );
  if (!limit.allowed) return jsonError('Too many edits in a row. Give it a minute.', 429);

  let body: { message: string; model?: string | null; source: 'chat' | 'voice' };
  try {
    body = chatEditSchema.parse(await request.json());
  } catch {
    return jsonError('Tell Lumen what to change.', 422);
  }

  const admin = createAdminClient();
  await admin.from('chat_messages').insert({
    project_id: projectId,
    role: 'user',
    content: body.message,
  });

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(sseEncode(payload));
        } catch {
          closed = true;
        }
      };

      const heartbeat = setInterval(() => send({ type: 'ping' }), 15_000);
      send({ type: 'stage', stage: 'code', message: 'Applying your change…' });

      try {
        const result = await runChatEdit({
          projectId,
          userId: user.id,
          request: body.message,
          requestedModel: body.model,
          source: body.source,
          onDelta: (delta) => send({ type: 'token', delta }),
        });

        const summary =
          result.changedPaths.length === 1
            ? `Updated \`${result.changedPaths[0]}\`.`
            : `Updated ${result.changedPaths.length} files: ${result.changedPaths
                .map((path) => `\`${path}\``)
                .join(', ')}.`;

        await admin.from('chat_messages').insert({
          project_id: projectId,
          role: 'assistant',
          content: summary,
          version_id: result.versionId,
        });

        send({
          type: 'done',
          versionId: result.versionId,
          message: summary,
          model: result.model,
        });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'That edit failed';
        await admin.from('chat_messages').insert({
          project_id: projectId,
          role: 'assistant',
          content: `I could not apply that: ${message}`,
        });
        send({ type: 'error', message });
      } finally {
        clearInterval(heartbeat);
        closed = true;
        try {
          controller.close();
        } catch {
          /* client already gone */
        }
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

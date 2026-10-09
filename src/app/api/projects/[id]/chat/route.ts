import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runChatEdit } from '@/lib/generation/pipeline';
import { chatEditSchema } from '@/lib/validation';
import { creditsExhausted, jsonError, sseEncode, sseHeaders } from '@/lib/api';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';
import { creditBalance } from '@/lib/openai/client';
import { canAfford, exhaustedMessage } from '@/lib/credits';
import { CREDIT_COST } from '@/lib/env';

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
    .eq('user_id', user.id)
    .maybeSingle();
  if (!project) return jsonError('Project not found', 404);


  const limit = await rateLimitUser(
    user.id,
    `chat:${user.id}`,
    RATE_LIMITS.chatEdit.limit,
    RATE_LIMITS.chatEdit.windowSeconds,
  );
  if (!limit.allowed) return jsonError('Too many edits in a row. Give it a minute.', 429);

  // Checked here rather than inside the stream: a refusal that arrives as an
  // SSE event is a red line in a chat log, and this one has an answer — the
  // upgrade dialog — which the client can only open from a real status code.
  const balance = await creditBalance(user.id);
  if (!canAfford(balance, CREDIT_COST.chat_edit)) {
    return creditsExhausted(exhaustedMessage(balance));
  }

  let body: { message: string; label?: string; model?: string | null; source: 'chat' | 'voice' };
  try {
    body = chatEditSchema.parse(await request.json());
  } catch {
    return jsonError('Tell Lumen what to change.', 422);
  }

  const admin = createAdminClient();
  // What the person actually asked for. Pressing "Create the About page" sends
  // a paragraph of instructions to the model; the history should remember the
  // button, not the paragraph.
  await admin.from('chat_messages').insert({
    project_id: projectId,
    role: 'user',
    content: body.label?.trim() || body.message,
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
      send({ type: 'step', id: 'read', label: 'Reading your site', done: false });

      try {
        let reading = true;
        const result = await runChatEdit({
          projectId,
          userId: user.id,
          request: body.message,
          requestedModel: body.model,
          source: body.source,
          onDelta: (delta) => send({ type: 'token', delta }),
          onStep: (step) => {
            // The first file opening is what proves the reading is over.
            if (reading) {
              reading = false;
              send({ type: 'step', id: 'read', label: 'Read your site', done: true });
            }
            send({ type: 'step', ...step });
          },
        });

        send({
          type: 'step',
          id: 'save',
          label: `Saved — ${result.changedPaths.length} file${result.changedPaths.length === 1 ? '' : 's'} changed`,
          done: true,
        });

        const updated =
          result.changedPaths.length === 1
            ? `Updated \`${result.changedPaths[0]}\`.`
            : `Updated ${result.changedPaths.length} files: ${result.changedPaths
                .map((path) => `\`${path}\``)
                .join(', ')}.`;

        /**
         * An edit that ignored the uploads is not a success with a footnote.
         *
         * "Updated index.html" was said whether or not a single picture had
         * been placed, so the only way to find out was to look at the site and
         * see the same empty frames. If any are still missing after the second
         * pass, the chat says so and says what to do about it.
         */
        const summary =
          result.missingAssets.length === 0
            ? updated
            : `${updated} But ${
                result.missingAssets.length === 1
                  ? 'one of your pictures is'
                  : `${result.missingAssets.length} of your pictures are`
              } still not on the page. Tell me which section ${
                result.missingAssets.length === 1 ? 'it belongs' : 'they belong'
              } in — "put these in the gallery", "use this one as the hero" — and I will place ${
                result.missingAssets.length === 1 ? 'it' : 'them'
              }.`;

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
          // So the workspace can put a newly written page in the page picker
          // rather than making someone reload to find out it worked.
          paths: result.changedPaths,
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

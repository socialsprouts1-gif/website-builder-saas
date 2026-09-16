import 'server-only';
import { openaiFor, resolveApiKey } from '@/lib/openai/client';
import { getModelCatalog, resolveModel } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { findByLumenId, parseElements } from './html-tree';

/**
 * Rewriting one section, leaving the rest of the page untouched.
 *
 * "Make the hero better" used to mean sending the whole site to the editor and
 * hoping only the hero came back changed. It usually did. Usually is the
 * problem: a rewrite that quietly restyles the footer is worse than one that
 * refuses, because nobody looks at the footer afterwards.
 *
 * So the section is cut out by its id, rewritten on its own, and spliced back
 * into exactly the space it came from. Nothing else in the file is ever in the
 * model's hands.
 */

const SYSTEM = `You rewrite ONE section of a small business website.

You are given the section's current HTML and nothing else of the page. Return the replacement section as HTML and nothing else — no explanation, no markdown fence, no <html> or <body>.

Rules, all of which matter more than the writing:
- Keep the outermost element exactly as it is: the same tag, the same class attribute, the same data-section and the same data-lumen-id. Those are how the page knows what this is.
- Keep every data-lumen-id that appears anywhere inside, on the same kind of element. They are how the editor addresses what is inside.
- Use only the classes already present in the section. The stylesheet is fixed and a new class name renders as nothing.
- Keep the same kind of structure: if it was a heading, a paragraph and three cards, come back with a heading, a paragraph and three cards.
- Keep every <img> src exactly as it is. The pictures are already hosted and you cannot know another working address.
- No <script>, no <style>, no inline event handlers, no <iframe>.
- Write for the business described, in plain words a customer would use. No filler, no "unlock", no "elevate".`;

/** What a rewritten section may contain before it is allowed near a page. */
export function isSafeSection(html: string, lumenId: string): string | null {
  const trimmed = html.trim();
  if (!trimmed) return 'nothing came back';
  if (trimmed.length > 20_000) return 'it came back far too long';

  // The model is writing markup that will be served to the public. These are
  // the things that would turn a rewritten section into someone else's code.
  if (/<\s*(script|iframe|object|embed|link|meta)\b/i.test(trimmed)) return 'it contained a script or a frame';
  if (/\son[a-z]+\s*=/i.test(trimmed)) return 'it contained an inline event handler';
  if (/javascript:/i.test(trimmed)) return 'it contained a javascript: link';

  // Without its id the section becomes unaddressable: the editor could not
  // select it again, and a second rewrite would have nothing to find.
  if (!trimmed.includes(`data-lumen-id="${lumenId}"`)) return 'it came back without its identifier';
  if (!/^<[a-z]/i.test(trimmed)) return 'it did not come back as an element';

  return null;
}

export interface RewriteResult {
  html: string;
  model: string;
}

/** Asks for one section back, and refuses anything it would not serve. */
export async function rewriteSection(params: {
  projectId: string;
  userId: string;
  pageHtml: string;
  lumenId: string;
  /** What the owner asked for, if they said anything. */
  instruction?: string | null;
  business: string;
  brief?: string | null;
  requestedModel?: string | null;
}): Promise<RewriteResult> {
  const tree = parseElements(params.pageHtml);
  const node = findByLumenId(tree, params.lumenId);
  if (!node) throw new Error('That section is not on this page any more.');

  const end = node.selfClosing ? node.openEnd : node.closeEnd;
  const current = params.pageHtml.slice(node.openStart, end);

  const { apiKey, source } = await resolveApiKey(params.userId, 'chat_edit');
  const catalog = await getModelCatalog(apiKey);
  const { model } = resolveModel(catalog, params.requestedModel);

  const response = await openaiFor(apiKey).chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          `The business: ${params.business}`,
          params.brief ? `What it does: ${params.brief.slice(0, 1200)}` : null,
          params.instruction
            ? `What to change: ${params.instruction}`
            : 'What to change: rewrite this section so it reads better and sells more clearly. Same structure, better words.',
          '',
          'The section as it stands:',
          current,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
  });

  await recordUsage({
    userId: params.userId,
    projectId: params.projectId,
    eventType: 'chat_edit',
    model,
    keySource: source,
    tokensIn: response.usage?.prompt_tokens,
    tokensOut: response.usage?.completion_tokens,
  });

  // Models wrap markup in a fence even when told not to, often enough that
  // refusing over it would just be refusing a good rewrite on a formality.
  const raw = (response.choices[0]?.message?.content ?? '')
    .replace(/^\s*```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const problem = isSafeSection(raw, params.lumenId);
  if (problem) throw new Error(`The rewrite was refused because ${problem}.`);

  return { html: raw, model };
}

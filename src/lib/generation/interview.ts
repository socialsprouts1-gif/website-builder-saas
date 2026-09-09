import 'server-only';

/**
 * The questions Lumen asks before it builds anything.
 *
 * One sentence is enough to start a site but not enough to get it right, and
 * the things that matter most — where the pictures come from, what a visitor is
 * meant to do, what the place is actually called — are exactly what a person
 * leaves out. So the model reads the request and writes the questions it
 * needs, rather than working from a fixed form that asks a plumber about
 * seating plans.
 */

export type QuestionKind = 'single' | 'multi' | 'text';

export interface InterviewOption {
  label: string;
  hint?: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  /** One line of context under the question. */
  help?: string;
  kind: QuestionKind;
  options: InterviewOption[];
  /** Whether a free-text answer is offered alongside the options. */
  allowOther: boolean;
}

export interface Answer {
  question: string;
  answer: string;
}

export const INTERVIEW_SYSTEM = `You interview a small business owner before their website is built.

Write the questions you actually need to build a good site for THIS request, in the order you would ask them. Ask about what you cannot reasonably assume; never ask something the request already answers.

HOW MANY
- A simple one-page site: 4 or 5 questions.
- A site implying several pages, a shop, bookings, a menu, listings or a portfolio: up to 9. Never more than 9, never fewer than 4.

ALWAYS ASK, wherever it is not already answered:
- Imagery: whether Lumen should generate illustrations and graphics, or the owner will upload their own photos later, or a mix. Offer those as options.
- The one thing a visitor should do — call, book, order, enquire, visit, sign up.
- The real business name and the town or area it serves.

GOOD QUESTIONS
- Concrete and answerable in one tap. Offer 2 to 5 options that are real choices, not "yes/no/maybe".
- Written for someone who has never built a website. No jargon: not "CTA", "hero", "above the fold", "conversion".
- Each option label is short — a few words. A hint of up to ten words may explain a trade-off.
- Use kind "single" when one answer fits, "multi" when several can be picked together (pages to include, services offered), "text" only when options genuinely cannot be enumerated, such as the business name.
- Set allowOther true whenever a sensible answer might not be listed.

Reply with JSON only, in this exact shape:
{"questions":[{"id":"imagery","question":"...","help":"...","kind":"single","options":[{"label":"...","hint":"..."}],"allowOther":true}]}

A "text" question has an empty options array. Ids are short lowercase slugs, unique within the set.`;

export function buildInterviewPrompt(params: {
  prompt: string;
  businessType?: string | null;
  hasScreenshot: boolean;
}): string {
  const lines = [`What they asked for: ${params.prompt}`];
  if (params.businessType) lines.push(`Category they picked: ${params.businessType}`);
  if (params.hasScreenshot) {
    lines.push(
      'They also uploaded a reference screenshot, so do not ask about overall layout or visual style — that is already settled.',
    );
  }
  return lines.join('\n');
}

const MAX_QUESTIONS = 9;
const MAX_OPTIONS = 5;

/**
 * The model is asked for a shape; this is what guarantees it. Anything
 * malformed is dropped rather than rendered, because a half-built question is
 * worse than one fewer question.
 */
export function normaliseQuestions(raw: unknown): InterviewQuestion[] {
  const list = (raw as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const questions: InterviewQuestion[] = [];

  for (const entry of list) {
    if (questions.length >= MAX_QUESTIONS) break;
    if (!entry || typeof entry !== 'object') continue;

    const row = entry as Record<string, unknown>;
    const question = typeof row.question === 'string' ? row.question.trim() : '';
    if (!question) continue;

    const id = slug(typeof row.id === 'string' && row.id ? row.id : question);
    if (seen.has(id)) continue;
    seen.add(id);

    const kind: QuestionKind =
      row.kind === 'multi' ? 'multi' : row.kind === 'text' ? 'text' : 'single';

    const options =
      kind === 'text'
        ? []
        : (Array.isArray(row.options) ? row.options : [])
            .map((option) => {
              const source = (option ?? {}) as Record<string, unknown>;
              const label = typeof source.label === 'string' ? source.label.trim() : '';
              const hint = typeof source.hint === 'string' ? source.hint.trim() : undefined;
              return label ? { label, ...(hint ? { hint } : {}) } : null;
            })
            .filter((option): option is InterviewOption => option !== null)
            .slice(0, MAX_OPTIONS);

    // A choice question with nothing to choose from is a text question.
    const resolvedKind: QuestionKind = kind !== 'text' && options.length === 0 ? 'text' : kind;

    questions.push({
      id,
      question,
      help: typeof row.help === 'string' && row.help.trim() ? row.help.trim() : undefined,
      kind: resolvedKind,
      options,
      allowOther: resolvedKind === 'text' ? false : row.allowOther !== false,
    });
  }

  return questions;
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'q'
  );
}

/**
 * Folds the answers into the brief. They are appended to the original request
 * rather than replacing it, so the generator sees both what was asked for and
 * what was clarified.
 */
export function applyAnswers(prompt: string, answers: Answer[]): string {
  const useful = answers.filter((answer) => answer.answer.trim().length > 0);
  if (useful.length === 0) return prompt;

  return [
    prompt,
    '',
    'The owner answered these questions about it:',
    ...useful.map((answer) => `- ${answer.question} → ${answer.answer.trim()}`),
  ].join('\n');
}

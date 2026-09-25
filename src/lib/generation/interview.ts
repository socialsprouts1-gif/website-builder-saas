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
- Their WhatsApp number, with id "whatsapp" and kind "text". Say plainly what it is for: enquiries and orders from the website arrive on WhatsApp, which is where most Indian small businesses actually read them. Make clear it can be left blank and added later. Ask it last, and never ask it twice.

GOOD QUESTIONS
- Concrete and answerable in one tap. Offer 2 to 5 options that are real choices, not "yes/no/maybe".
- Written for someone who has never built a website. No jargon: not "CTA", "hero", "above the fold", "conversion".
- Each option label is short — a few words. A hint of up to ten words may explain a trade-off.
- Use kind "single" when one answer fits, "multi" when several can be picked together (pages to include, services offered), "text" only when options genuinely cannot be enumerated, such as the business name.
- Set allowOther true whenever a sensible answer might not be listed.

Reply with JSON only, in this exact shape:
{"questions":[{"id":"imagery","question":"...","help":"...","kind":"single","options":[{"label":"...","hint":"..."}],"allowOther":true}]}

A "text" question has an empty options array. Ids are short lowercase slugs, unique within the set.`;

/**
 * A template the owner already chose, as the interviewer needs to see it.
 *
 * The questions worth asking change completely once a template is picked.
 * Nothing about the look is still open — so asking about it wastes one of the
 * nine questions and implies a choice that will not be honoured — and the
 * pages are already drawn, which means the interview's whole job becomes
 * collecting the facts those particular sections need: the prices for a prices
 * band, the names for a team band, the questions for an FAQ.
 */
export interface InterviewTemplate {
  /** The template's own name. */
  name: string;
  /** The industry it is filed under, in words. */
  industry: string;
  /** The kinds of business it was drawn for. */
  businessTypes: string[];
  /** The one action the whole site is built around. */
  action: string;
  /** Page titles, in the order they appear in the nav. */
  pages: string[];
  /** What the sections on those pages need supplied, in plain words. */
  needs: string[];
  /** Whether it has a catalogue, a basket and a checkout. */
  sells: boolean;
}

export function buildInterviewPrompt(params: {
  prompt: string;
  businessType?: string | null;
  hasScreenshot: boolean;
  template?: InterviewTemplate | null;
}): string {
  const lines = [`What they asked for: ${params.prompt}`];
  if (params.businessType) lines.push(`Category they picked: ${params.businessType}`);
  if (params.hasScreenshot) {
    lines.push(
      'They also uploaded a reference screenshot, so do not ask about overall layout or visual style — that is already settled.',
    );
  }

  const template = params.template;
  if (template) {
    const about: string[] = [
      `They already chose a template, so the design and the structure are settled. It is a ${template.industry.toLowerCase()} site drawn for a ${template.businessTypes
        .join(' or ')
        .toLowerCase()}, with ${template.pages.length} pages — ${template.pages.join(
        ', ',
      )} — built around one action: ${template.action}.`,
      'Do not ask about colours, style, layout, which pages to include, or how many sections there should be. All of that is already decided, and a question about it would imply a choice that will not be honoured.',
    ];
    if (template.needs.length > 0) {
      about.push(
        `Those pages have places for ${template.needs.join(
          '; ',
        )}. Ask for whichever of those cannot be written without them — the actual items, the actual prices, the actual names — never whether they would like such a section.`,
      );
    }
    if (template.sells) {
      about.push(
        'It is a shop, with a catalogue, a basket and a checkout. Ask what they sell and roughly what it costs, and how it reaches the customer — delivery, pickup, or both.',
      );
    }
    about.push(
      'Still ask for the real business name, the town it serves, and the WhatsApp number, exactly as instructed above.',
    );
    lines.push('', ...about);
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

/**
 * The WhatsApp number out of the interview answers.
 *
 * A setting rather than a sentence. Folded only into the brief it would end up
 * as copy on a page and nowhere the product could use it — so it is read out
 * here and saved against the project, which is what makes enquiries and orders
 * actually arrive on somebody's phone.
 *
 * Matched by id first and by the wording of the question second, because the
 * model writes the questions and does not always use the id it was asked for.
 */
export function whatsappFromAnswers(
  answers: { question: string; answer: string; id?: string }[],
): string | null {
  const looksLikeIt = (entry: { question: string; id?: string }) =>
    entry.id === 'whatsapp' || /whats\s?app/i.test(entry.question);

  for (const entry of answers) {
    if (!looksLikeIt(entry)) continue;
    const digits = (entry.answer ?? '').replace(/[^\d]/g, '');
    if (digits.length >= 10) return entry.answer.trim();
  }
  return null;
}

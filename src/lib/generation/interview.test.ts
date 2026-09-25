import { describe, expect, it } from 'vitest';
import { buildInterviewPrompt, normaliseQuestions, type InterviewTemplate } from './interview';

const TEMPLATE: InterviewTemplate = {
  name: 'Bright',
  industry: 'Dental & clinics',
  businessTypes: ['Dental clinic', 'Orthodontist'],
  action: 'Book an appointment',
  pages: ['Home', 'Treatments', 'The team', 'Contact'],
  needs: ['prices', 'the people who work there'],
  sells: false,
};

describe('buildInterviewPrompt', () => {
  it('says nothing about templates when none was chosen', () => {
    const prompt = buildInterviewPrompt({
      prompt: 'A bakery in Pune',
      hasScreenshot: false,
    });
    expect(prompt).toContain('A bakery in Pune');
    expect(prompt.toLowerCase()).not.toContain('template');
  });

  it('describes the chosen template and closes the design questions', () => {
    const prompt = buildInterviewPrompt({
      prompt: 'Sharma Dental, Akola',
      hasScreenshot: false,
      template: TEMPLATE,
    });

    // The pages are the thing the questions have to fill.
    expect(prompt).toContain('Home, Treatments, The team, Contact');
    expect(prompt).toContain('Book an appointment');
    expect(prompt).toContain('prices; the people who work there');

    // And the thing it must not spend a question on, because the answer would
    // be ignored: the template already decided all of it.
    expect(prompt).toMatch(/do not ask about colours, style, layout/i);

    // The four it must still ask survive the template block.
    expect(prompt).toMatch(/business name/i);
    expect(prompt).toMatch(/whatsapp/i);
  });

  it('asks a shop about stock and delivery, and nothing else about one', () => {
    const shop = buildInterviewPrompt({
      prompt: 'A clothing store',
      hasScreenshot: false,
      template: { ...TEMPLATE, sells: true },
    });
    expect(shop).toMatch(/delivery, pickup, or both/i);

    const clinic = buildInterviewPrompt({
      prompt: 'A dental clinic',
      hasScreenshot: false,
      template: TEMPLATE,
    });
    expect(clinic).not.toMatch(/delivery/i);
  });

  it('keeps the screenshot note alongside a template', () => {
    const prompt = buildInterviewPrompt({
      prompt: 'This card',
      hasScreenshot: true,
      template: TEMPLATE,
    });
    expect(prompt).toMatch(/reference screenshot/i);
    expect(prompt).toContain('Treatments');
  });
});

describe('normaliseQuestions', () => {
  it('drops a question with nothing to answer and keeps the rest', () => {
    const questions = normaliseQuestions({
      questions: [
        { id: 'name', question: 'What is it called?', kind: 'text' },
        { question: '   ' },
        { id: 'name', question: 'Asked twice', kind: 'text' },
        { id: 'pics', question: 'Photos?', kind: 'single', options: [{ label: 'Generate them' }] },
      ],
    });
    expect(questions.map((question) => question.id)).toEqual(['name', 'pics']);
  });

  it('turns a choice question with no choices into a typed answer', () => {
    const [question] = normaliseQuestions({
      questions: [{ id: 'town', question: 'Which town?', kind: 'single', options: [] }],
    });
    expect(question.kind).toBe('text');
    expect(question.allowOther).toBe(false);
  });
});

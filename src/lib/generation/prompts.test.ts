import { describe, expect, it } from 'vitest';
import { buildBriefPrompt, OWN_MATERIAL_MARK, VISION_SYSTEM } from './prompts';
import type { ScreenshotExtraction } from './types';

/**
 * Whose picture it is.
 *
 * Someone's own visiting card is the fastest they will ever hand over their
 * phone number. Someone else's website is not theirs to copy. The same
 * extraction feeds both, and which one it is decides whether the details
 * printed on it are used or deliberately thrown away.
 */
const EXTRACTION: ScreenshotExtraction = {
  kind: 'visiting card',
  layoutRegions: ['header', 'contact block'],
  palette: ['#0b3d2e', '#f7f6f3'],
  typography: 'Serif display, sans body',
  components: ['logo', 'phone'],
  observedCopyThemes: ['trust'],
  notes: 'Card, portrait',
  details: {
    businessName: 'KITS Tech Learning',
    tagline: 'Coaching that shows results',
    phone: '+91 98765 43210',
    email: 'hi@kits.in',
    address: 'Tower Chowk, Akola',
    website: null,
    services: ['Class 10 tuition', 'JEE foundation'],
  },
};

describe('buildBriefPrompt with an upload that is the owner’s own', () => {
  const brief = buildBriefPrompt({ prompt: 'x', extraction: EXTRACTION, ownMaterial: true });

  it.each([
    ['the business name', 'KITS Tech Learning'],
    ['the phone number', '+91 98765 43210'],
    ['the address', 'Tower Chowk, Akola'],
    ['the services', 'JEE foundation'],
  ])('uses %s printed on it', (_label, value) => {
    expect(brief).toContain(value);
  });

  it('does not also tell the model to avoid reusing them', () => {
    expect(brief).not.toMatch(/do not reuse the business name/i);
  });
});

describe('buildBriefPrompt with a design the user merely likes', () => {
  const brief = buildBriefPrompt({ prompt: 'x', extraction: EXTRACTION, ownMaterial: false });

  it.each([
    ['the business name', 'KITS Tech Learning'],
    ['the phone number', '+91 98765 43210'],
    ['the address', 'Tower Chowk'],
    ['the services', 'JEE foundation'],
  ])('lets nothing identifying survive — %s', (_label, value) => {
    expect(brief).not.toContain(value);
  });

  it('says so explicitly, and keeps the look', () => {
    expect(brief).toMatch(/do not reuse the business name/i);
    expect(brief).toContain('layoutRegions');
    expect(brief).toContain('#0b3d2e');
  });
});

describe('the default when nobody said', () => {
  // The safe default is the one that cannot take something that is not yours.
  it('is treated as someone else’s design', () => {
    expect(buildBriefPrompt({ prompt: 'x', extraction: EXTRACTION })).not.toContain('+91 98765 43210');
  });
});

describe('OWN_MATERIAL_MARK', () => {
  // It travels in the brief, which is the only thing that survives project
  // creation, a queued job row and a later invocation. So it has to read
  // correctly to the model and be testable exactly.
  it('survives being put in a brief', () => {
    expect(`Build a site.\n\n${OWN_MATERIAL_MARK}`).toContain(OWN_MATERIAL_MARK);
  });

  it('reads as a sentence, because the model sees it', () => {
    expect(OWN_MATERIAL_MARK).toMatch(/^[A-Z].*\.$/);
  });
});

describe('VISION_SYSTEM', () => {
  it.each(['poster', 'visiting card', 'Instagram', 'menu', 'logo', 'sketch'])(
    'knows an upload can be a %s',
    (kind) => {
      expect(VISION_SYSTEM).toMatch(new RegExp(kind, 'i'));
    },
  );

  it('keeps structure and details apart, and never guesses', () => {
    expect(VISION_SYSTEM).toMatch(/keep them separate/i);
    expect(VISION_SYSTEM).toMatch(/Never guess/i);
  });
});

describe('a brief with no upload at all', () => {
  it('does not talk about an image', () => {
    expect(buildBriefPrompt({ prompt: 'a salon' })).not.toMatch(/uploaded an image/i);
  });
});

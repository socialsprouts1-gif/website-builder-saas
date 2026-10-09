import { describe, expect, it } from 'vitest';
import { VOICES, isVoiceId } from './chatbot-voice.shared';

/**
 * The voice list is what the settings page offers and what the mint endpoint
 * trusts. A value that gets past the guard is sent to the model provider as a
 * voice name, so the guard is the whole validation.
 */
describe('the voices on offer', () => {
  it('has a distinct id, label and note for each', () => {
    expect(VOICES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(VOICES.map((voice) => voice.id)).size).toBe(VOICES.length);
    for (const voice of VOICES) {
      expect(voice.id).toMatch(/^[a-z]+$/);
      expect(voice.label.length).toBeGreaterThan(2);
      expect(voice.note.length).toBeGreaterThan(8);
    }
  });

  it('recognises the ones it offers', () => {
    for (const voice of VOICES) expect(isVoiceId(voice.id)).toBe(true);
  });

  it('refuses anything else', () => {
    for (const value of ['', 'ALLOY', 'alloy ', 'nova', null, undefined, 7, {}, ['alloy']]) {
      expect(isVoiceId(value), String(value)).toBe(false);
    }
  });
});

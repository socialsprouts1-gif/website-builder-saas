import { describe, expect, it } from 'vitest';
import { isSelectableModel } from './models';

/**
 * What the model picker is allowed to offer.
 *
 * It used to list every id the key could reach. `text-embedding-3-small`
 * cannot write a web page, and offering it as a way to build one is a trap.
 */
describe('isSelectableModel', () => {
  it.each([
    'text-embedding-3-small',
    'whisper-1',
    'tts-1',
    'dall-e-3',
    'gpt-image-2',
    'gpt-4o-transcribe',
    'omni-moderation-latest',
    'o3-mini',
    'claude-3',
    'sora-2',
    'gpt-realtime',
  ])('refuses %s, which cannot write a website', (id) => {
    expect(isSelectableModel(id)).toBe(false);
  });

  it.each(['gpt-5.6', 'gpt-5.6-sol', 'gpt-5.6-mini', 'gpt-4.1', 'gpt-5.3-codex'])(
    'offers %s',
    (id) => {
      expect(isSelectableModel(id)).toBe(true);
    },
  );
});

/**
 * The voices, without the server-only machinery around them.
 *
 * `chatbot-voice.ts` imports `server-only` because it holds the key handling,
 * and a client component importing it would fail the build. The list itself is
 * just data that both sides need.
 */
export const VOICES = [
  { id: 'alloy', label: 'Alloy', note: 'Even and neutral. The safe default.' },
  { id: 'echo', label: 'Echo', note: 'Lower and calmer.' },
  { id: 'shimmer', label: 'Shimmer', note: 'Brighter and warmer.' },
  { id: 'coral', label: 'Coral', note: 'Friendly, a little faster.' },
  { id: 'sage', label: 'Sage', note: 'Measured and quiet.' },
  { id: 'verse', label: 'Verse', note: 'Expressive, with more range.' },
] as const;

export type VoiceId = (typeof VOICES)[number]['id'];

export const isVoiceId = (value: unknown): value is VoiceId =>
  typeof value === 'string' && VOICES.some((voice) => voice.id === value);

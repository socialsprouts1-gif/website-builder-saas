import { describe, expect, it } from 'vitest';
import { messageOf, redact } from './errors';

/**
 * What gets written down when something fails.
 *
 * The risk in writing failures down is writing down more than intended: an
 * upstream library prints the request it made, and the request had an
 * Authorization header on it. A log that leaks a key is a worse problem than
 * the failure it was recording.
 */
describe('redact', () => {
  it.each([
    ['an OpenAI key', 'Bad key sk-proj-AbCdEf123456789xyz used'],
    ['a Supabase secret', 'auth failed for sb_secret_9aBcD3fGh1jKlMnOp'],
    ['a Razorpay key', 'rzp_live_AbCdEf12345678 rejected'],
    ['a publishable key', 'pk_test_51AbCdEfGhIjKlMnOp failed'],
    ['a webhook secret', 'whsec_AbCdEf123456789xyz mismatch'],
  ])('takes %s out', (_label, message) => {
    const clean = redact(message);
    expect(clean).toContain('[redacted]');
    expect(clean).not.toMatch(/AbCdEf12345|9aBcD3fGh1jKlMnOp/);
  });

  it('takes a bearer token out', () => {
    expect(redact('called with Bearer abc123def456ghi789')).toBe('called with Bearer [redacted]');
  });

  it('takes a JWT out', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc';
    expect(redact(`token ${jwt} expired`)).toContain('[redacted-token]');
    expect(redact(`token ${jwt} expired`)).not.toContain('eyJhbGciOi');
  });

  // Over-redacting would make the log useless, which is its own failure.
  it.each([
    'Could not reach the database',
    'That section is not on this page any more.',
    'Google answered 429 when Lumen asked for that page.',
    'skip this one',
  ])('leaves an ordinary message alone: %j', (message) => {
    expect(redact(message)).toBe(message);
  });
});

describe('messageOf', () => {
  it('reads an Error', () => {
    expect(messageOf(new Error('it broke'))).toBe('it broke');
  });

  it('falls back to the name when there is no message', () => {
    const error = new Error('');
    error.name = 'AbortError';
    expect(messageOf(error)).toBe('AbortError');
  });

  it('reads a thrown string', () => {
    expect(messageOf('just a string')).toBe('just a string');
  });

  it('reads a thrown object', () => {
    expect(messageOf({ code: 42 })).toBe('{"code":42}');
  });

  // Supabase throws plain objects, and one of them once had a circular
  // reference in it. A logger that throws while logging helps nobody.
  it('survives something that cannot be stringified', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(messageOf(circular)).toBe('Unknown error');
  });

  it('has an answer for null and undefined', () => {
    expect(messageOf(null)).toBeTruthy();
    expect(messageOf(undefined)).toBeTruthy();
  });
});

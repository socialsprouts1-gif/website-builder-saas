import { describe, expect, it } from 'vitest';
import { checkPassword, MIN_LENGTH, passwordStrength } from './password';

describe('checkPassword', () => {
  it('accepts a long ordinary password', () => {
    expect(checkPassword('correct horse battery').ok).toBe(true);
    expect(checkPassword('aaaabcdefghij').ok).toBe(true);
  });

  /** Length is what resists guessing; odd characters mostly resist memory. */
  it('asks for length rather than punctuation', () => {
    expect(checkPassword('Sh0rt!').ok).toBe(false);
    expect(checkPassword('Sh0rt!').problem).toContain(String(MIN_LENGTH));
    expect(checkPassword('thispasswordislong').ok).toBe(true);
  });

  it('refuses the ones that are always guessed first', () => {
    for (const bad of ['password123', 'PASSWORD123', '1234567890', 'iloveyou']) {
      expect(checkPassword(bad).ok, bad).toBe(false);
    }
  });

  it('refuses something long but repetitive', () => {
    expect(checkPassword('aaaaaaaaaaaaaaa').ok).toBe(false);
    expect(checkPassword('ababababababab').ok).toBe(false);
  });

  it('refuses a password containing the account’s own email name', () => {
    expect(checkPassword('vivekborkar1234', 'vivekborkar62@gmail.com').ok).toBe(false);
    expect(checkPassword('somethingelse99', 'vivekborkar62@gmail.com').ok).toBe(true);
  });

  /** "a@x.com" must not reject every password containing the letter a. */
  it('is not tripped up by a very short email name', () => {
    expect(checkPassword('a long enough phrase', 'a@x.com').ok).toBe(true);
  });

  it('refuses something absurdly long rather than storing it', () => {
    expect(checkPassword(`${'x'.repeat(500)}abc`).ok).toBe(false);
  });

  it('always says why', () => {
    for (const bad of ['short', 'password123', 'aaaaaaaaaaaa']) {
      const verdict = checkPassword(bad);
      expect(verdict.ok).toBe(false);
      expect(verdict.problem?.length ?? 0).toBeGreaterThan(10);
    }
  });
});

describe('passwordStrength', () => {
  it('scores nothing below the minimum length', () => {
    expect(passwordStrength('short')).toBe(0);
  });

  it('rewards length over punctuation', () => {
    expect(passwordStrength('a-very-long-passphrase-indeed')).toBe(3);
    expect(passwordStrength('Ab1!efghij')).toBeLessThan(3);
  });

  it('never returns a score outside its own range', () => {
    for (const password of ['', 'x', 'x'.repeat(400), 'Aa1!Aa1!Aa1!Aa1!']) {
      expect([0, 1, 2, 3]).toContain(passwordStrength(password));
    }
  });
});

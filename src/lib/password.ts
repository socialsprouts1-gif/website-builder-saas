/**
 * What counts as a usable password.
 *
 * Length first, because length is what actually resists guessing, and a rule
 * demanding a capital letter and a symbol mostly produces "Password1!". The
 * only other checks are the ones that catch a password certain to be guessed:
 * a handful of the most-used ones, and the person's own email address.
 *
 * Pure, so the rule shown while somebody types is the same rule enforced when
 * they submit.
 */

export const MIN_LENGTH = 10;
export const MAX_LENGTH = 200;

/** The ones that turn up at the top of every breach corpus. */
const OBVIOUS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyuiop',
  'iloveyou',
  'admin123',
  'welcome123',
  'letmein123',
  'abc123456',
]);

export interface PasswordVerdict {
  ok: boolean;
  /** Why not, in words a person can act on. */
  problem: string | null;
}

export function checkPassword(password: string, email = ''): PasswordVerdict {
  if (password.length < MIN_LENGTH) {
    return { ok: false, problem: `Use at least ${MIN_LENGTH} characters. Longer beats odder.` };
  }
  if (password.length > MAX_LENGTH) {
    return { ok: false, problem: 'That is longer than we can store. Shorten it a little.' };
  }

  const lowered = password.toLowerCase();
  if (OBVIOUS.has(lowered)) {
    return { ok: false, problem: 'That is one of the most common passwords there is. Pick another.' };
  }

  // Long but worthless: one or two characters repeated.
  if (new Set(lowered).size <= 2) {
    return { ok: false, problem: 'That is too repetitive to be a password.' };
  }

  // Not the whole local part, which almost never appears verbatim. The pieces
  // of it do: "vivekborkar62@..." becomes the password "vivekborkar1234", and
  // matching only the exact name would wave that straight through.
  if (emailParts(email).some((part) => lowered.includes(part))) {
    return { ok: false, problem: 'Do not put your name or email address in your password.' };
  }

  return { ok: true, problem: null };
}

/**
 * The recognisable pieces of an email address.
 *
 * Split on punctuation and with trailing digits dropped, because a person
 * called vivekborkar62 is called vivekborkar. Pieces shorter than four
 * characters are ignored: "a@x.com" must not reject every password containing
 * the letter a.
 */
function emailParts(email: string): string[] {
  const local = email.split('@')[0]?.toLowerCase().trim() ?? '';
  if (!local) return [];

  return [local, ...local.split(/[^a-z0-9]+/)]
    .map((piece) => piece.replace(/\d+$/, ''))
    .filter((piece) => piece.length >= 4);
}

/** A rough, honest signal for the meter — not a security claim. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length < MIN_LENGTH) return 0;
  const variety =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^a-zA-Z0-9]/.test(password));

  if (password.length >= 16 || (password.length >= 12 && variety >= 3)) return 3;
  if (password.length >= 12 || variety >= 3) return 2;
  return 1;
}

export const STRENGTH_LABELS = ['Too short', 'Weak', 'Good', 'Strong'] as const;

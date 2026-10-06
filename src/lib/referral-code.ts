/**
 * Tidying a referral code typed, pasted or read down a phone.
 *
 * Shared by the sign-up screen and the server that redeems it, so a code that
 * looks valid on the page is the same string the database is asked about.
 * Lowercase, spaces and the hyphens people add to make it readable all come
 * out; anything left that is not a letter or a digit was never part of it.
 */
export function normaliseCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

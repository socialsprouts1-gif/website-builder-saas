/**
 * Money, in paise, as integers.
 *
 * Never floating point. `0.1 + 0.2` is `0.30000000000000004`, and a shop that
 * is a hundredth of a rupee out on every third order is a shop whose owner
 * stops trusting the totals. Everything here is whole paise; rupees exist only
 * at the two edges — what the owner types in, and what the customer reads.
 */

/** ₹1 = 100 paise. */
export const PAISE = 100;

/**
 * What the owner typed, as paise.
 *
 * Accepts the ways a price actually gets typed: "499", "₹499", "1,499.50",
 * " 499 ". Rejects anything that is not a plain amount rather than guessing —
 * a price read wrong is money read wrong.
 */
export function parseRupees(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.round(value * PAISE) : null;
  }

  const text = value.replace(/[₹\s,]/g, '').trim();
  if (!text) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;

  const paise = Math.round(Number(text) * PAISE);
  return Number.isFinite(paise) && paise >= 0 ? paise : null;
}

/**
 * What the customer reads.
 *
 * Indian digit grouping, because this is for Indian shops: ₹1,00,000 and not
 * ₹100,000. Whole rupees lose the ".00" — a price list full of "₹499.00" reads
 * like a spreadsheet, not a shop.
 */
export function formatRupees(paise: number): string {
  const safe = Number.isFinite(paise) ? Math.round(paise) : 0;
  const negative = safe < 0;
  const absolute = Math.abs(safe);

  const rupees = Math.floor(absolute / PAISE);
  const remainder = absolute % PAISE;

  const digits = String(rupees);
  // Last three, then pairs: the Indian grouping.
  const grouped =
    digits.length > 3
      ? `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${digits.slice(-3)}`
      : digits;

  const body = remainder === 0 ? grouped : `${grouped}.${String(remainder).padStart(2, '0')}`;
  return `${negative ? '-' : ''}₹${body}`;
}

/** The same amount as a plain number of rupees, for an input field. */
export function toRupeeInput(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '';
  return (Math.round(paise) / PAISE).toFixed(2).replace(/\.00$/, '');
}

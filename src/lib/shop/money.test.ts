import { describe, expect, it } from 'vitest';
import { formatRupees, parseRupees, toRupeeInput } from './money';

describe('parseRupees', () => {
  it('reads the ways a price is actually typed', () => {
    expect(parseRupees('499')).toBe(49900);
    expect(parseRupees('₹499')).toBe(49900);
    expect(parseRupees(' 1,499.50 ')).toBe(149950);
    expect(parseRupees('0')).toBe(0);
  });

  it('keeps two decimal places exactly', () => {
    expect(parseRupees('0.01')).toBe(1);
    expect(parseRupees('10.10')).toBe(1010);
    // The classic float failure, which must not survive a round trip.
    expect(parseRupees('0.10')! + parseRupees('0.20')!).toBe(30);
  });

  it('refuses anything that is not a plain amount', () => {
    expect(parseRupees('')).toBeNull();
    expect(parseRupees('free')).toBeNull();
    expect(parseRupees('-5')).toBeNull();
    expect(parseRupees('1.999')).toBeNull();
    expect(parseRupees('12abc')).toBeNull();
    expect(parseRupees(null)).toBeNull();
  });
});

describe('formatRupees', () => {
  it('drops the decimals on a whole amount', () => {
    expect(formatRupees(49900)).toBe('₹499');
    expect(formatRupees(0)).toBe('₹0');
  });

  it('keeps them when there are any', () => {
    expect(formatRupees(149950)).toBe('₹1,499.50');
    expect(formatRupees(1)).toBe('₹0.01');
  });

  /** ₹1,00,000, not ₹100,000 — this is for Indian shops. */
  it('groups digits the Indian way', () => {
    expect(formatRupees(10000000)).toBe('₹1,00,000');
    expect(formatRupees(100000000)).toBe('₹10,00,000');
    expect(formatRupees(999900)).toBe('₹9,999');
  });
});

describe('toRupeeInput', () => {
  it('round-trips through the input field', () => {
    expect(toRupeeInput(49900)).toBe('499');
    expect(toRupeeInput(149950)).toBe('1499.50');
    expect(parseRupees(toRupeeInput(149950))).toBe(149950);
    expect(toRupeeInput(null)).toBe('');
  });
});

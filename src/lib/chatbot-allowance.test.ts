import { describe, expect, it } from 'vitest';
import { FREE_REPLIES, checkAllowance, periodKey, type ChatbotMeter } from './chatbot-allowance';

const meter = (over: Partial<ChatbotMeter> = {}): ChatbotMeter => ({
  id: 'bot',
  replies_used: 0,
  replies_period: periodKey(),
  own_key_cipher: null,
  ...over,
});

describe('what the assistant is allowed to answer', () => {
  it('gives every site a free allowance on Lumen’s key', () => {
    const fresh = checkAllowance(meter());
    expect(fresh.allowed).toBe(true);
    expect(fresh.source).toBe('platform');
    expect(fresh.remaining).toBe(FREE_REPLIES);
    expect(FREE_REPLIES).toBe(10);
  });

  it('stops at the allowance and says something a customer can act on', () => {
    const spent = checkAllowance(meter({ replies_used: FREE_REPLIES }));
    expect(spent.allowed).toBe(false);
    expect(spent.remaining).toBe(0);
    // A visitor on somebody's shop is not a customer of Lumen's. They must
    // never be told about credits, plans or billing — only what to do next.
    expect(spent.message).toBeTruthy();
    expect(spent.message!.toLowerCase()).not.toMatch(/credit|plan|upgrade|billing|owner|paid/);
    expect(spent.message!.toLowerCase()).toMatch(/contact|call/);
  });

  /**
   * The whole reason this is separate from build credits: an owner who has
   * spent theirs still wants the assistant answering customers on a live site.
   */
  it('never meters a site that brought its own key', () => {
    const own = checkAllowance(meter({ own_key_cipher: 'x', replies_used: 9_999 }));
    expect(own.allowed).toBe(true);
    expect(own.source).toBe('own');
    expect(own.remaining).toBe(Number.POSITIVE_INFINITY);
  });

  /**
   * The month rolls over by comparison, not by a scheduled job. A job that
   * failed would silently leave every assistant on the platform switched off.
   */
  it('rolls over without anything having to run', () => {
    const lastMonth = checkAllowance(
      meter({ replies_used: FREE_REPLIES, replies_period: '2020-01' }),
    );
    expect(lastMonth.allowed).toBe(true);
    expect(lastMonth.used).toBe(0);
    expect(lastMonth.remaining).toBe(FREE_REPLIES);
  });

  it('treats a chatbot that has never answered as unspent', () => {
    expect(checkAllowance(meter({ replies_period: null, replies_used: 7 })).remaining).toBe(FREE_REPLIES);
  });

  it('writes the period as year and month, in UTC', () => {
    expect(periodKey(new Date('2026-03-09T23:30:00Z'))).toBe('2026-03');
    expect(periodKey(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
  });
});

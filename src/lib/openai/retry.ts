import 'server-only';

/**
 * Retrying an OpenAI call out loud.
 *
 * The SDK retries throttled requests by itself, silently, with a three-minute
 * timeout each — so a rate-limited key could spend nine minutes inside one
 * "request" while the build screen showed nothing at all. That is
 * indistinguishable from a hang, and it is what a new key on a low usage tier
 * does under a large generation.
 *
 * Retrying here instead means every wait can be said out loud.
 */

export interface RetryNotice {
  attempt: number;
  waitMs: number;
  reason: 'rate_limit' | 'server_error' | 'timeout';
  message: string;
}

const MAX_ATTEMPTS = 4;

export function classifyFailure(cause: unknown): RetryNotice['reason'] | null {
  const status = (cause as { status?: number } | null)?.status;
  if (status === 429) return 'rate_limit';
  if (typeof status === 'number' && status >= 500) return 'server_error';

  const name = (cause as { name?: string } | null)?.name;
  if (name === 'APIConnectionTimeoutError' || name === 'APIConnectionError') return 'timeout';
  return null;
}

/** What a person should be told while they wait. */
export function describeFailure(reason: RetryNotice['reason']): string {
  if (reason === 'rate_limit') {
    return 'OpenAI is rate-limiting this key — waiting for its limit to reset';
  }
  if (reason === 'server_error') return 'OpenAI returned an error — trying again';
  return 'OpenAI is slow to respond — trying again';
}

/**
 * The message shown when retrying has not helped. Rate limiting is the one
 * failure the account holder can actually fix, so it says how.
 */
export function finalMessage(reason: RetryNotice['reason']): string {
  if (reason === 'rate_limit') {
    return 'OpenAI is rate-limiting this key. New keys start on a low usage tier with a small tokens-per-minute allowance, which a full site exceeds. Check Limits in your OpenAI account, or add billing to raise the tier.';
  }
  if (reason === 'server_error') return 'OpenAI is having trouble right now. Try again in a few minutes.';
  return 'OpenAI did not respond in time. Try again, or pick the fast model.';
}

/**
 * Runs an OpenAI call, retrying the failures that are worth retrying and
 * reporting each wait. Anything else — a bad key, a bad request — is thrown
 * straight through, because retrying it would only waste the user's time.
 */
export async function callWithRetry<T>(
  run: () => Promise<T>,
  onWait?: (notice: RetryNotice) => void | Promise<void>,
): Promise<T> {
  let lastReason: RetryNotice['reason'] = 'server_error';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await run();
    } catch (cause) {
      const reason = classifyFailure(cause);
      if (!reason) throw cause;

      lastReason = reason;
      if (attempt === MAX_ATTEMPTS) break;

      // 4s, 12s, 30s. A rate limit window is usually a minute, so the last
      // wait is long enough to land on the other side of one.
      const waitMs = [4_000, 12_000, 30_000][attempt - 1] ?? 30_000;
      await onWait?.({ attempt, waitMs, reason, message: describeFailure(reason) });
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw new Error(finalMessage(lastReason));
}

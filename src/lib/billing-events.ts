/**
 * What a Razorpay webhook means for a subscription's status.
 *
 * Pure, and separate from the route, because the decision it makes is the one
 * that decides whether somebody is a paying customer — and because the set of
 * events arriving is not ours to control. The dashboard offers fifty-five
 * checkboxes and it is entirely reasonable for a founder to tick all of them,
 * so this has to be right for events nobody anticipated, not only for the seven
 * that matter.
 *
 * The rule: a known event names the status outright, an unknown one is believed
 * only when it carries a status of its own, and anything else changes nothing.
 * Returning null rather than guessing is the whole point — the previous version
 * defaulted to 'active', so an `invoice.expired` for a lapsed subscription
 * marked the account as paying.
 */

const KNOWN: Record<string, string> = {
  'subscription.activated': 'active',
  'subscription.charged': 'active',
  'subscription.resumed': 'active',
  'subscription.authenticated': 'authenticated',
  'subscription.pending': 'pending',
  'subscription.halted': 'halted',
  'subscription.paused': 'paused',
  'subscription.cancelled': 'cancelled',
  'subscription.completed': 'completed',
};

export function statusForEvent(
  eventName: string,
  entityStatus?: string | null,
): string | null {
  const known = KNOWN[eventName];
  if (known) return known;

  // An event we do not model, but Razorpay told us what the subscription is.
  // Believing it is safe: it is the subscription's own status, not our reading
  // of an event name.
  if (entityStatus) return entityStatus;

  // Everything else — an invoice event, a payment event, a product we do not
  // use — leaves the row exactly as it was.
  return null;
}

/** The events this webhook is worth subscribing to. Quoted in the setup docs. */
export const SUBSCRIPTION_EVENTS = Object.keys(KNOWN);

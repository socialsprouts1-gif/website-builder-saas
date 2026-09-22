/**
 * Where an order gets to.
 *
 * Five states, which is what a small shop actually tracks: it arrived, it is
 * paid for, it is packed, it has gone, or it is off. Anything more elaborate is
 * a workflow nobody keeps up to date.
 *
 * Kept apart from the ownership check next door because the owner's screens are
 * a client component, and anything it imports is bundled for the browser — a
 * module marked `server-only` in that import graph fails the build.
 */
export const ORDER_STATUSES = ['placed', 'paid', 'packed', 'sent', 'cancelled'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'New',
  paid: 'Paid',
  packed: 'Packed',
  sent: 'Sent',
  cancelled: 'Cancelled',
};

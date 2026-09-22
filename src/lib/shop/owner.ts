import 'server-only';

/**
 * Ownership, from the one place that decides it.
 *
 * Re-exported rather than reimplemented: the shop writes orders, addresses and
 * prices with the service role, so "is this person allowed to touch this
 * project" has to be the same question here as everywhere else.
 */
export { ownedProject } from '@/lib/projects';

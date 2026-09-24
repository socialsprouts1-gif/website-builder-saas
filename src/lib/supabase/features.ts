import 'server-only';
import { createAdminClient } from './admin';
import { isMissingTableError } from './errors';
import type { Database } from '@/lib/database.types';

/**
 * Which half-installed migration is switching a feature off.
 *
 * Every read in this product is written to survive a missing table, because a
 * database part-way through its migrations must still serve somebody their
 * home page. That was the right call and it had a cost nobody had counted:
 * silence. A clothing shop was generated against a database with no `products`
 * table, so the product bands, the basket and the checkout all rendered as
 * nothing, the build charged five credits, and the owner was told the site was
 * ready. Degrading quietly is only kind when somebody is told what degraded.
 *
 * Each probe is a head count — no rows are read — and the answer is cached, so
 * asking on every app request costs one query a minute at worst.
 */

export type FeatureId = 'leads' | 'whatsapp' | 'bookings' | 'shop' | 'traffic' | 'templates';

export interface MissingFeature {
  id: FeatureId;
  /** What the owner loses, in their words rather than the schema's. */
  label: string;
  consequence: string;
  migration: string;
}

interface Probe extends MissingFeature {
  /** A table that must exist, or a column that must exist on a table. */
  table: TableName;
  column?: string;
}

/**
 * Only tables the generated types already know about, so a probe cannot go
 * looking for a table nobody ever created and report it missing forever.
 */
type TableName = keyof Database['public']['Tables'];

const PROBES: Probe[] = [
  {
    id: 'leads',
    table: 'leads',
    label: 'Enquiries',
    consequence: 'Every message sent through a contact form is discarded.',
    migration: '0012_leads.sql',
  },
  {
    id: 'whatsapp',
    table: 'projects',
    column: 'whatsapp_number',
    label: 'WhatsApp handover',
    consequence: 'Enquiries and orders cannot be sent to a phone.',
    migration: '0013_traffic_whatsapp_bookings.sql',
  },
  {
    id: 'bookings',
    table: 'projects',
    column: 'booking_enabled',
    label: 'Bookings',
    consequence: 'Appointment and table requests have nowhere to land.',
    migration: '0013_traffic_whatsapp_bookings.sql',
  },
  {
    id: 'traffic',
    table: 'site_visits',
    label: 'Visitor counts',
    consequence: 'A published site records no traffic at all.',
    migration: '0013_traffic_whatsapp_bookings.sql',
  },
  {
    id: 'shop',
    table: 'shop_products',
    label: 'Shop',
    consequence:
      'A site that sells things is built with no product cards, no product pages, no basket and no checkout.',
    migration: '0015_shop.sql',
  },
  {
    id: 'templates',
    table: 'projects',
    column: 'blueprint_id',
    label: 'Templates',
    consequence: 'A site cannot be built from a template in the library.',
    migration: '0017_project_blueprint.sql',
  },
];

/** PostgREST reports an absent column separately from an absent table. */
function isMissingColumnError(error: unknown): boolean {
  if (!error) return false;
  const candidate = error as { code?: string; message?: string };
  if (candidate.code === '42703' || candidate.code === 'PGRST204') return true;
  return Boolean(candidate.message && /column .* does not exist|could not find the .* column/i.test(candidate.message));
}

async function probe(entry: Probe): Promise<boolean> {
  try {
    const { error } = await createAdminClient()
      .from(entry.table)
      .select(entry.column ?? 'id', { count: 'exact', head: true })
      .limit(1);
    return isMissingTableError(error) || isMissingColumnError(error);
  } catch {
    // Unreachable database. That is a different problem with its own screen,
    // and claiming a migration is missing on the strength of it would send
    // somebody to run SQL that is already there.
    return false;
  }
}

let cache: { missing: MissingFeature[]; expiresAt: number } | null = null;

export async function missingFeatures(): Promise<MissingFeature[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.missing;

  const results = await Promise.all(PROBES.map(async (entry) => ((await probe(entry)) ? entry : null)));
  const missing = results.filter((entry): entry is Probe => entry !== null).map(
    ({ id, label, consequence, migration }) => ({ id, label, consequence, migration }),
  );

  // Re-checked quickly while something is missing, so running the SQL takes
  // effect almost immediately; slowly once everything is there.
  cache = { missing, expiresAt: Date.now() + (missing.length ? 20_000 : 300_000) };
  return missing;
}

export async function isFeatureReady(id: FeatureId): Promise<boolean> {
  return !(await missingFeatures()).some((entry) => entry.id === id);
}

/** Cleared when a migration is run, so the app does not wait out the cache. */
export function forgetFeatureCache(): void {
  cache = null;
}

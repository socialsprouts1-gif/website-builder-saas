import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { noteError } from '@/lib/errors';
import { parseRupees } from './money';
import { uniqueSlug } from './catalogue';

/**
 * Filling a new shop, so it is a shop rather than an empty room.
 *
 * A generated e-commerce site whose Shop page says "no products yet" is not a
 * website anyone can show a customer — it is homework. The plan the model
 * already writes includes a starter catalogue, so the shop opens with real
 * products in real categories at plausible prices, and the owner edits or
 * replaces them instead of starting from nothing.
 *
 * Everything here is best-effort. A shop that fails to seed leaves a site that
 * is still a good site, so nothing in here is allowed to fail a build.
 */

export interface StarterProduct {
  title: string;
  summary?: string;
  description?: string;
  /** As the model writes it: "499", "1,299". */
  price?: string | number;
  compareAt?: string | number;
  category?: string;
}

/**
 * The model's starter catalogue, clamped into rows.
 *
 * Anything without a title or a price is dropped rather than written as a
 * product with no name at ₹0 — a shop is a place where things have prices.
 */
export function toProductRows(
  projectId: string,
  starters: StarterProduct[],
): {
  project_id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  price_paise: number;
  compare_at_paise: number | null;
  category: string | null;
  images: string[];
  position: number;
}[] {
  const taken: string[] = [];
  const rows = [];

  for (const starter of starters.slice(0, 12)) {
    const title = String(starter.title ?? '').trim().slice(0, 140);
    const price = parseRupees(starter.price ?? null);
    if (!title || price === null || price === 0) continue;

    const compareAt = parseRupees(starter.compareAt ?? null);
    const slug = uniqueSlug(title, taken);
    taken.push(slug);

    rows.push({
      project_id: projectId,
      slug,
      title,
      summary: starter.summary ? String(starter.summary).trim().slice(0, 200) : null,
      description: starter.description ? String(starter.description).trim().slice(0, 2000) : null,
      price_paise: price,
      // Only a genuine reduction. A crossed-out price that is not higher is a
      // lie printed on someone's shop.
      compare_at_paise: compareAt !== null && compareAt > price ? compareAt : null,
      category: starter.category ? String(starter.category).trim().slice(0, 60) : null,
      // Left empty on purpose. A stock photograph of someone else's product is
      // worse than the placeholder, which at least reads as "add a picture".
      images: [],
      position: rows.length,
    });
  }

  return rows;
}

/** What a shop charges for delivery until its owner says otherwise. */
export function defaultRates(projectId: string) {
  return [
    {
      project_id: projectId,
      label: 'Standard delivery',
      note: '3–5 working days',
      price_paise: 5000,
      free_over_paise: 99900,
      position: 0,
    },
    {
      project_id: projectId,
      label: 'Express delivery',
      note: '1–2 working days',
      price_paise: 15000,
      free_over_paise: null,
      position: 1,
    },
  ];
}

/**
 * Switches the shop on and puts the starter catalogue in it.
 *
 * Only ever on a shop that is empty: a rebuild must not bury an owner's real
 * products under a fresh set of invented ones.
 */
export async function seedShop(projectId: string, starters: StarterProduct[]): Promise<void> {
  try {
    const admin = createAdminClient();

    const { error: settingsError } = await admin
      .from('projects')
      .update({ shop_enabled: true })
      .eq('id', projectId);

    // Migration 0015 has not been run. The site is still a good site; the shop
    // pages will say the shop is not switched on, which is the truth.
    if (settingsError) return;

    const { count } = await admin
      .from('shop_products')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if ((count ?? 0) > 0) return;

    const rows = toProductRows(projectId, starters);
    if (rows.length > 0) await admin.from('shop_products').insert(rows);

    const { count: rateCount } = await admin
      .from('shop_shipping_rates')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if ((rateCount ?? 0) === 0) await admin.from('shop_shipping_rates').insert(defaultRates(projectId));
  } catch (cause) {
    await noteError({ scope: 'shop.seed', error: cause, projectId });
  }
}

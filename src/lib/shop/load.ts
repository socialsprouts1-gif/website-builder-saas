import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Product, ShippingRate } from './catalogue';

/**
 * Reading a shop out of the database.
 *
 * Always through the service role, and never from a customer's own key: the
 * person browsing a shop has no account, and a key that could read products
 * could read orders. It is the same reasoning as the enquiry endpoint — the
 * visitor is a customer, not a user.
 *
 * Every read is allowed to come back empty. These tables arrive in migration
 * 0015, and a database that has not run it yet must still serve somebody their
 * home page rather than fall over on a select.
 */

export interface ShopData {
  enabled: boolean;
  products: Product[];
  rates: ShippingRate[];
  codEnabled: boolean;
  paymentUrl: string | null;
  paymentNote: string | null;
}

export const NO_SHOP: ShopData = {
  enabled: false,
  products: [],
  rates: [],
  codEnabled: true,
  paymentUrl: null,
  paymentNote: null,
};

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  summary: string | null;
  price_paise: number | null;
  compare_at_paise: number | null;
  category: string | null;
  images: unknown;
  stock: number | null;
  active: boolean | null;
  position: number | null;
};

type RateRow = {
  id: string;
  label: string;
  note: string | null;
  price_paise: number | null;
  free_over_paise: number | null;
  position: number | null;
  active: boolean | null;
};

/** Images are jsonb, so whatever is in the column has to be checked. */
function imagesOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0).slice(0, 8);
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    summary: row.summary,
    pricePaise: Math.max(0, Math.round(row.price_paise ?? 0)),
    compareAtPaise:
      row.compare_at_paise === null || row.compare_at_paise === undefined
        ? null
        : Math.max(0, Math.round(row.compare_at_paise)),
    category: row.category,
    images: imagesOf(row.images),
    stock: row.stock === null || row.stock === undefined ? null : Math.max(0, Math.round(row.stock)),
    active: row.active !== false,
    position: Math.round(row.position ?? 0),
  };
}

export function toRate(row: RateRow): ShippingRate {
  return {
    id: row.id,
    label: row.label,
    note: row.note,
    pricePaise: Math.max(0, Math.round(row.price_paise ?? 0)),
    freeOverPaise:
      row.free_over_paise === null || row.free_over_paise === undefined
        ? null
        : Math.max(0, Math.round(row.free_over_paise)),
    position: Math.round(row.position ?? 0),
    active: row.active !== false,
  };
}

const PRODUCT_COLUMNS =
  'id, slug, title, description, summary, price_paise, compare_at_paise, category, images, stock, active, position';

export async function loadShop(projectId: string): Promise<ShopData> {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from('projects')
    .select('shop_enabled, shop_cod_enabled, shop_payment_note, payment_url')
    .eq('id', projectId)
    .maybeSingle();

  // Migration 0015 has not been run. Nothing to serve, and nothing broken.
  if (!settings || settings.shop_enabled !== true) return NO_SHOP;

  const [products, rates] = await Promise.all([
    admin
      .from('shop_products')
      .select(PRODUCT_COLUMNS)
      .eq('project_id', projectId)
      .eq('active', true)
      .order('position', { ascending: true })
      .limit(300),
    admin
      .from('shop_shipping_rates')
      .select('id, label, note, price_paise, free_over_paise, position, active')
      .eq('project_id', projectId)
      .eq('active', true)
      .order('position', { ascending: true })
      .limit(20),
  ]);

  return {
    enabled: true,
    products: (products.data ?? []).map((row) => toProduct(row as ProductRow)),
    rates: (rates.data ?? []).map((row) => toRate(row as RateRow)),
    codEnabled: settings.shop_cod_enabled !== false,
    paymentUrl: typeof settings.payment_url === 'string' ? settings.payment_url : null,
    paymentNote: typeof settings.shop_payment_note === 'string' ? settings.shop_payment_note : null,
  };
}

/** Everything the owner sees, including what is switched off. */
export async function loadShopForOwner(projectId: string): Promise<{
  products: Product[];
  rates: ShippingRate[];
}> {
  const admin = createAdminClient();
  const [products, rates] = await Promise.all([
    admin
      .from('shop_products')
      .select(PRODUCT_COLUMNS)
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .limit(300),
    admin
      .from('shop_shipping_rates')
      .select('id, label, note, price_paise, free_over_paise, position, active')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .limit(20),
  ]);

  return {
    products: (products.data ?? []).map((row) => toProduct(row as ProductRow)),
    rates: (rates.data ?? []).map((row) => toRate(row as RateRow)),
  };
}

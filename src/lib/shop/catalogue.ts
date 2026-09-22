/**
 * What a shop is made of, and the rules about it that are worth being sure of.
 *
 * Nothing here talks to a database or a browser. The same functions decide what
 * a customer sees on the page and what the server charges for at checkout, so
 * the two can never disagree — which is the failure that turns a shop into an
 * argument.
 */

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  summary: string | null;
  pricePaise: number;
  compareAtPaise: number | null;
  category: string | null;
  images: string[];
  /** Null means the shop does not count stock. Zero means sold out. */
  stock: number | null;
  active: boolean;
  position: number;
}

export interface ShippingRate {
  id: string;
  label: string;
  note: string | null;
  pricePaise: number;
  /** Free once the basket reaches this. Null means never free. */
  freeOverPaise: number | null;
  position: number;
  active: boolean;
}

/** A shop with nothing to sell is a shop nobody should be sent to. */
export function sellableProducts(products: Product[]): Product[] {
  return products
    .filter((product) => product.active)
    .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
}

/**
 * Sold out, or still on the shelf.
 *
 * A null stock is "not counted", which is most small shops: they know what is
 * in the back room and do not want the website deciding.
 */
export function inStock(product: Product): boolean {
  return product.stock === null || product.stock > 0;
}

/** How many of this a customer may actually put in a basket. */
export function maxQuantity(product: Product): number {
  if (product.stock === null) return 99;
  return Math.max(0, Math.min(99, product.stock));
}

/** On offer only when the crossed-out price is genuinely higher. */
export function isReduced(product: Product): boolean {
  return product.compareAtPaise !== null && product.compareAtPaise > product.pricePaise;
}

/** Percentage off, rounded the way a shop would write it. */
export function discountPercent(product: Product): number | null {
  if (!isReduced(product)) return null;
  const off = ((product.compareAtPaise! - product.pricePaise) / product.compareAtPaise!) * 100;
  const rounded = Math.round(off);
  return rounded >= 1 ? rounded : null;
}

/**
 * The categories a shop actually has, in the order products give them.
 *
 * Derived rather than stored. A category with nothing in it is a link to an
 * empty page, and a category list that has to be maintained separately from
 * the products is a category list that goes stale.
 */
export function categoriesOf(products: Product[]): string[] {
  const seen = new Map<string, string>();
  for (const product of sellableProducts(products)) {
    const name = product.category?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()];
}

/** Case- and space-insensitive, because a category is typed by hand each time. */
export function inCategory(product: Product, category: string): boolean {
  return (product.category ?? '').trim().toLowerCase() === category.trim().toLowerCase();
}

/**
 * A product's address within the shop.
 *
 * Deliberately narrow: lowercase letters, digits and hyphens only. This ends up
 * in a URL and in an href on a page served from Lumen's own domain, so
 * everything else is removed rather than escaped.
 */
export function productSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'item';
}

/** The same, made unique against what the shop already has. */
export function uniqueSlug(title: string, taken: Iterable<string>): string {
  const base = productSlug(title);
  const used = new Set([...taken].map((value) => value.toLowerCase()));
  if (!used.has(base)) return base;

  for (let attempt = 2; attempt < 1000; attempt += 1) {
    const candidate = `${base}-${attempt}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Shipping choices, in the order the owner arranged them. */
export function offeredRates(rates: ShippingRate[]): ShippingRate[] {
  return rates
    .filter((rate) => rate.active)
    .sort((a, b) => a.position - b.position || a.pricePaise - b.pricePaise);
}

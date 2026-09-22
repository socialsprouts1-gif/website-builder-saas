import {
  inStock,
  maxQuantity,
  offeredRates,
  type Product,
  type ShippingRate,
} from './catalogue';

/**
 * What a basket costs.
 *
 * The browser works this out so the customer can watch it change, and the
 * server works it out again before it writes an order down. Both call this.
 * They have to: the cart lives in the customer's own browser, so the quantities
 * arriving at checkout are whatever they chose to send — and a shop that bills
 * from a number the browser supplied is a shop that can be charged ₹1 for
 * anything.
 */

/** What the browser sends: a product and how many. Prices are not its business. */
export interface CartRequest {
  productId: string;
  quantity: number;
}

export interface PricedLine {
  product: Product;
  quantity: number;
  unitPaise: number;
  linePaise: number;
}

export interface Totals {
  lines: PricedLine[];
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  rate: ShippingRate | null;
  /** Lines that were asked for and could not be sold, and why. */
  rejected: { productId: string; reason: 'unknown' | 'unavailable' | 'out-of-stock' }[];
  count: number;
}

/**
 * Prices a basket against the catalogue as it stands right now.
 *
 * Quantities are clamped to what is actually on the shelf rather than refused:
 * someone who asks for ten of something with three left wants three, and
 * emptying their basket over it loses the sale for no one's benefit.
 */
export function priceCart(requests: CartRequest[], catalogue: Product[]): PricedLine[] {
  const byId = new Map(catalogue.map((product) => [product.id, product]));
  const lines: PricedLine[] = [];

  for (const request of requests) {
    const product = byId.get(request.productId);
    if (!product || !product.active || !inStock(product)) continue;

    const wanted = Math.floor(Number(request.quantity));
    if (!Number.isFinite(wanted) || wanted < 1) continue;

    const quantity = Math.min(wanted, maxQuantity(product));
    if (quantity < 1) continue;

    lines.push({
      product,
      quantity,
      unitPaise: product.pricePaise,
      linePaise: product.pricePaise * quantity,
    });
  }

  return lines;
}

/** Everything that was asked for and cannot be sold, so it can be said out loud. */
export function rejectionsFor(
  requests: CartRequest[],
  catalogue: Product[],
): Totals['rejected'] {
  const byId = new Map(catalogue.map((product) => [product.id, product]));
  const rejected: Totals['rejected'] = [];

  for (const request of requests) {
    const product = byId.get(request.productId);
    if (!product) {
      rejected.push({ productId: request.productId, reason: 'unknown' });
      continue;
    }
    if (!product.active) {
      rejected.push({ productId: request.productId, reason: 'unavailable' });
      continue;
    }
    if (!inStock(product)) rejected.push({ productId: request.productId, reason: 'out-of-stock' });
  }

  return rejected;
}

export function subtotalOf(lines: PricedLine[]): number {
  return lines.reduce((sum, line) => sum + line.linePaise, 0);
}

/**
 * What the chosen delivery costs on a basket this size.
 *
 * Free over a threshold means free at the threshold too — "free over ₹999" with
 * ₹999 in the basket charging for delivery is the kind of detail that gets a
 * shop a one-star review.
 */
export function shippingFor(rate: ShippingRate | null, subtotalPaise: number): number {
  if (!rate) return 0;
  if (rate.freeOverPaise !== null && subtotalPaise >= rate.freeOverPaise) return 0;
  return rate.pricePaise;
}

/**
 * The whole bill.
 *
 * The rate is chosen by id, and an id that is not on offer falls back to the
 * first one rather than to nothing: a checkout that silently drops the delivery
 * charge is a checkout that loses the owner money on every order.
 */
export function orderTotals(
  requests: CartRequest[],
  catalogue: Product[],
  rates: ShippingRate[],
  chosenRateId: string | null,
): Totals {
  const lines = priceCart(requests, catalogue);
  const subtotalPaise = subtotalOf(lines);

  const offered = offeredRates(rates);
  const rate =
    offered.find((candidate) => candidate.id === chosenRateId) ?? offered[0] ?? null;

  const shippingPaise = lines.length > 0 ? shippingFor(rate, subtotalPaise) : 0;

  return {
    lines,
    subtotalPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
    rate: lines.length > 0 ? rate : null,
    rejected: rejectionsFor(requests, catalogue),
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

/**
 * The reference a customer quotes on the phone.
 *
 * Short, unambiguous out loud, and with no runs of characters that get misheard:
 * no letter O against a zero, no I against a 1.
 */
const REFERENCE_ALPHABET = '23456789ACDEFGHJKLMNPQRTUVWXYZ';

export function orderReference(random: () => number = Math.random): string {
  let out = '';
  for (let index = 0; index < 6; index += 1) {
    out += REFERENCE_ALPHABET[Math.floor(random() * REFERENCE_ALPHABET.length)];
  }
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}

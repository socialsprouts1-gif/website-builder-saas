import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { logError } from '@/lib/errors';
import { orderReference, orderTotals, type CartRequest } from './cart';
import { formatRupees } from './money';
import { whatsappHref } from '@/lib/whatsapp';
import type { ShopData } from './load';

/**
 * Writing an order down.
 *
 * The browser says which products and how many. It does not say what they
 * cost, what delivery costs, or what the total is — those are all worked out
 * here, from the catalogue, immediately before the row is written. A shop that
 * bills from a number the browser supplied is a shop that can be charged ₹1
 * for a ₹10,000 order by anyone who can open developer tools.
 */

export interface PlacedOrder {
  reference: string;
  totalPaise: number;
  paymentUrl: string | null;
  note: string;
  /**
   * The order, ready to send to the shop on WhatsApp.
   *
   * Sent by the customer rather than by us, which needs no API, no approval
   * and no business account — and means the owner gets a real conversation
   * with the person who ordered, on the app they actually read. The order is
   * already recorded before this is offered, so a customer who never presses
   * it has still placed their order.
   */
  whatsappUrl: string | null;
}

export interface OrderRequest {
  projectId: string;
  shop: ShopData;
  lines: CartRequest[];
  shippingRateId: string | null;
  customer: {
    name: string;
    contact: string;
    email: string;
    address: string;
    city: string;
    postcode: string;
    note: string;
  };
  /** Marks an order the owner placed against their own preview. */
  fromPreview?: boolean;
}

export class EmptyOrderError extends Error {}

export async function placeOrder(request: OrderRequest): Promise<PlacedOrder> {
  const totals = orderTotals(
    request.lines,
    request.shop.products,
    request.shop.rates,
    request.shippingRateId,
  );

  // Everything in the basket has sold out or been taken down since it was put
  // there. Charging for nothing, or for what is left without saying so, are
  // both worse than telling them.
  if (totals.lines.length === 0) {
    throw new EmptyOrderError(
      'Nothing in your basket is available any more. Please have another look at the shop.',
    );
  }

  const admin = createAdminClient();
  const method = request.shop.paymentUrl ? 'link' : 'cod';

  // Six characters from a thirty-character alphabet is about 700 million, and
  // a clash only has to be unique within one shop. Retried rather than trusted.
  let reference = orderReference();
  let orderId: string | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5 && !orderId; attempt += 1) {
    const { data, error } = await admin
      .from('shop_orders')
      .insert({
        project_id: request.projectId,
        reference,
        customer_name: request.customer.name || null,
        customer_contact: request.customer.contact || null,
        customer_email: request.customer.email || null,
        address: request.customer.address || null,
        city: request.customer.city || null,
        postcode: request.customer.postcode || null,
        note: noteFor(request),
        shipping_label: totals.rate?.label ?? null,
        subtotal_paise: totals.subtotalPaise,
        shipping_paise: totals.shippingPaise,
        total_paise: totals.totalPaise,
        status: 'placed',
        payment_method: method,
      })
      .select('id')
      .single();

    if (data) {
      orderId = data.id;
      break;
    }
    lastError = error;
    reference = orderReference();
  }

  if (!orderId) {
    await logError({ scope: 'shop.order', error: lastError, projectId: request.projectId });
    throw new Error('That order could not be placed. Please try again, or call us to order.');
  }

  const { error: itemsError } = await admin.from('shop_order_items').insert(
    totals.lines.map((line) => ({
      order_id: orderId,
      product_id: line.product.id,
      title: line.product.title,
      unit_paise: line.unitPaise,
      quantity: line.quantity,
      line_paise: line.linePaise,
    })),
  );

  if (itemsError) {
    // The order exists and the customer is owed an answer. An order with a
    // total and a phone number is still an order the owner can ring about, so
    // this is written down rather than thrown.
    await logError({
      scope: 'shop.order.items',
      error: itemsError,
      projectId: request.projectId,
      detail: { reference },
    });
  }

  // Stock only comes down for shops that count it. `null` means the owner does
  // not, and inventing a count for them would take products off their own site.
  await Promise.all(
    totals.lines
      .filter((line) => line.product.stock !== null)
      .map((line) =>
        admin
          .from('shop_products')
          .update({ stock: Math.max(0, (line.product.stock ?? 0) - line.quantity) })
          .eq('id', line.product.id),
      ),
  ).catch(async (cause) => {
    await logError({ scope: 'shop.order.stock', error: cause, projectId: request.projectId });
  });

  return {
    reference,
    totalPaise: totals.totalPaise,
    paymentUrl: request.shop.paymentUrl,
    whatsappUrl: request.shop.whatsappNumber
      ? whatsappHref(
          request.shop.whatsappNumber,
          orderMessage({
            reference,
            customer: request.customer,
            lines: totals.lines.map((line) => ({
              title: line.product.title,
              quantity: line.quantity,
              linePaise: line.linePaise,
            })),
            shippingLabel: totals.rate?.label ?? null,
            shippingPaise: totals.shippingPaise,
            totalPaise: totals.totalPaise,
          }),
        )
      : null,
    note: request.shop.paymentUrl
      ? `Please pay ${formatRupees(totals.totalPaise)} using the button below, quoting ${reference}.`
      : request.shop.codEnabled
        ? `${formatRupees(totals.totalPaise)} to pay on delivery. We will call you to confirm.`
        : `${formatRupees(totals.totalPaise)} in total. We will be in touch to arrange payment.`,
  };
}

/**
 * The order as the owner will read it on their phone.
 *
 * Written to be understood at a glance and acted on without opening anything
 * else: what was ordered, what it comes to, where it is going and who to ring.
 */
export function orderMessage(order: {
  reference: string;
  customer: { name: string; contact: string; address: string; city: string; postcode: string; note: string };
  lines: { title: string; quantity: number; linePaise: number }[];
  shippingLabel: string | null;
  shippingPaise: number;
  totalPaise: number;
}): string {
  const items = order.lines
    .map((line) => `• ${line.title} × ${line.quantity} — ${formatRupees(line.linePaise)}`)
    .join('\n');

  const where = [order.customer.address, order.customer.city, order.customer.postcode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  return [
    `New order ${order.reference}`,
    '',
    items,
    order.shippingLabel
      ? `${order.shippingLabel}: ${order.shippingPaise === 0 ? 'Free' : formatRupees(order.shippingPaise)}`
      : '',
    `Total: ${formatRupees(order.totalPaise)}`,
    '',
    order.customer.name ? `Name: ${order.customer.name}` : '',
    order.customer.contact ? `Phone: ${order.customer.contact}` : '',
    where ? `Deliver to: ${where}` : '',
    order.customer.note.trim() ? `Note: ${order.customer.note.trim()}` : '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/** The customer's own words, plus anything the shop should know about the order. */
function noteFor(request: OrderRequest): string | null {
  const parts = [request.customer.note.trim()].filter(Boolean);
  if (request.fromPreview) parts.push('(Test order, placed from the preview.)');
  return parts.length > 0 ? parts.join('\n\n') : null;
}

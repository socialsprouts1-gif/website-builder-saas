import { notFound } from 'next/navigation';
import { ShopManager, type ShopOrder } from '@/components/app/shop/ShopManager';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadShopForOwner } from '@/lib/shop/load';
import { requestOrigin } from '@/lib/request-origin';

export const metadata = { title: 'Shop' };
export const dynamic = 'force-dynamic';

/**
 * Running the shop on this site.
 *
 * The other half of a checkout. A shop that takes orders and puts them where
 * nobody looks is the same failure as a contact form that thanks you and
 * throws the message away — so this is where the products are kept, where the
 * orders arrive with an address attached, and where the shop is switched on.
 */
export default async function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Whatever domain the owner is looking at this on, so every link and
  // snippet below belongs to it rather than to a build-time guess.
  const origin = await requestOrigin();
  const user = await requireUser();

  const supabase = await createClient();
  // RLS scopes this to the caller, so a hit proves ownership.
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, public_slug, published_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!project) notFound();

  // Asked for separately and allowed to fail: these columns arrive in
  // migration 0015, and a database that has not run it yet should reach the
  // page and be told what to do rather than crash on a select.
  const { data: settings, error: settingsError } = await supabase
    .from('projects')
    .select('shop_enabled, shop_cod_enabled, shop_payment_note, payment_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const migrationMissing = Boolean(settingsError);

  const { products, rates } = migrationMissing
    ? { products: [], rates: [] }
    : await loadShopForOwner(id).catch(() => ({ products: [], rates: [] }));

  const { data: orderRows } = migrationMissing
    ? { data: null }
    : await supabase
        .from('shop_orders')
        .select(
          'id, reference, customer_name, customer_contact, address, city, postcode, note, shipping_label, subtotal_paise, shipping_paise, total_paise, status, payment_method, created_at',
        )
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(100);

  // One query for every order's lines rather than one per order.
  const { data: itemRows } = orderRows && orderRows.length > 0
    ? await supabase
        .from('shop_order_items')
        .select('order_id, title, quantity, unit_paise, line_paise')
        .in(
          'order_id',
          orderRows.map((row) => row.id),
        )
    : { data: null };

  const itemsByOrder = new Map<string, ShopOrder['items']>();
  for (const item of itemRows ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({
      title: item.title,
      quantity: item.quantity,
      unitPaise: item.unit_paise,
      linePaise: item.line_paise,
    });
    itemsByOrder.set(item.order_id, list);
  }

  const orders: ShopOrder[] = (orderRows ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    customerName: row.customer_name,
    customerContact: row.customer_contact,
    address: row.address,
    city: row.city,
    postcode: row.postcode,
    note: row.note,
    shippingLabel: row.shipping_label,
    subtotalPaise: row.subtotal_paise,
    shippingPaise: row.shipping_paise,
    totalPaise: row.total_paise,
    status: row.status,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    items: itemsByOrder.get(row.id) ?? [],
  }));

  const base = project.public_slug && project.published_at
    ? `${origin}/s/${project.public_slug}/`
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-2xl text-ink-primary">Shop</h1>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">
        What you sell, what has been ordered, and what delivery costs. Changes here show on the site
        immediately — nothing to rebuild or republish.
      </p>

      <div className="mt-6">
        <ShopManager
          projectId={project.id}
          products={products}
          rates={rates}
          orders={orders}
          migrationMissing={migrationMissing}
          siteUrl={base}
          settings={{
            enabled: settings?.shop_enabled === true,
            codEnabled: settings?.shop_cod_enabled !== false,
            paymentNote: settings?.shop_payment_note ?? '',
            paymentUrl: settings?.payment_url ?? '',
          }}
        />
      </div>
    </div>
  );
}

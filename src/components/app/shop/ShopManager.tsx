'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input } from '@/components/ui/Field';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { cn } from '@/components/ui/cn';
import { EMPTY_DRAFT, ProductEditor, draftOf, type ProductDraft } from './ProductEditor';
import { categoriesOf, type Product, type ShippingRate } from '@/lib/shop/catalogue';
import { formatRupees, toRupeeInput } from '@/lib/shop/money';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/lib/shop/orders';

export interface ShopOrder {
  id: string;
  reference: string;
  customerName: string | null;
  customerContact: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  note: string | null;
  shippingLabel: string | null;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  items: { title: string; quantity: number; unitPaise: number; linePaise: number }[];
}

export interface ShopSettings {
  enabled: boolean;
  codEnabled: boolean;
  paymentNote: string;
  paymentUrl: string;
}

type Tab = 'products' | 'orders' | 'delivery' | 'settings';

/**
 * Running the shop.
 *
 * Four things, because a shop is four things: what is for sale, what has been
 * ordered, what delivery costs, and whether the shop is open. Everything here
 * writes to the database and shows up on the site immediately — no rebuild, no
 * republish, because the shop pages are rendered from these rows every time
 * somebody loads them.
 */
export function ShopManager({
  projectId,
  products,
  rates,
  orders,
  settings: initialSettings,
  migrationMissing,
  siteUrl,
}: {
  projectId: string;
  products: Product[];
  rates: ShippingRate[];
  orders: ShopOrder[];
  settings: ShopSettings;
  /** Migration 0015 has not been run, so none of this can be saved yet. */
  migrationMissing: boolean;
  siteUrl: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(orders.length > 0 ? 'orders' : 'products');
  // Products, rates and orders are read straight off the props rather than
  // copied into state. `router.refresh()` after a save re-renders this with
  // fresh ones, and a `useState` seeded from a prop would ignore every one of
  // them — a product added and then not there until a reload.
  const [settings, setSettings] = useState(initialSettings);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => categoriesOf(products), [products]);
  const newOrders = orders.filter((order) => order.status === 'placed').length;

  async function send(path: string, method: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/shop${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'That could not be saved');
      setEditing(null);
      setDraft(EMPTY_DRAFT);
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That could not be saved');
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (migrationMissing) {
    return (
      <div className="lumen-panel space-y-3 rounded-card border border-[#e5a15a]/30 bg-[#e5a15a]/10 p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#e5a15a]">One step first</p>
        <p className="text-[13.5px] leading-relaxed text-ink-secondary">
          The shop needs its tables, which arrive in migration 0015. Open{' '}
          <code className="text-ink-primary">supabase/setup.sql</code>, paste the whole file into the
          Supabase SQL editor and run it — it is safe to re-run — then reload this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!settings.enabled ? (
        <div className="lumen-panel flex flex-wrap items-center gap-4 rounded-card border border-accent/25 p-4">
          <div className="min-w-[240px] flex-1">
            <p className="text-[13.5px] text-ink-primary">This shop is switched off.</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
              Nobody can see the Shop, Basket or Checkout pages until you switch it on.
            </p>
          </div>
          <Button
            onClick={() => {
              void send('', 'PATCH', { enabled: true }).then((ok) => {
                if (ok) setSettings({ ...settings, enabled: true });
              });
            }}
            disabled={busy}
          >
            Open the shop
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {(
          [
            { id: 'products', label: `Products (${products.length})` },
            { id: 'orders', label: newOrders > 0 ? `Orders (${newOrders} new)` : 'Orders' },
            { id: 'delivery', label: 'Delivery' },
            { id: 'settings', label: 'Settings' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'rounded-pill px-3.5 py-1.5 text-[13px] transition',
              tab === item.id ? 'bg-accent-soft text-accent' : 'text-ink-secondary hover:text-ink-primary',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {tab === 'products' ? (
        <div className="space-y-4">
          {editing === 'new' ? (
            <ProductEditor
              projectId={projectId}
              draft={draft}
              onChange={setDraft}
              onSave={() => void send('/products', 'POST', draft)}
              onCancel={() => {
                setEditing(null);
                setDraft(EMPTY_DRAFT);
              }}
              saving={busy}
              categories={categories}
            />
          ) : (
            <Button
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setEditing('new');
              }}
            >
              Add a product
            </Button>
          )}

          {products.length === 0 && editing !== 'new' ? (
            <EmptyState
              title="Nothing for sale yet"
              message="Add your first product and it appears on the site straight away — no rebuild, no republish."
            />
          ) : null}

          <div className="space-y-2">
            {products.map((product) =>
              editing === product.id ? (
                <ProductEditor
                  key={product.id}
                  projectId={projectId}
                  draft={draft}
                  onChange={setDraft}
                  onSave={() => void send('/products', 'PATCH', { id: product.id, ...draft })}
                  onCancel={() => setEditing(null)}
                  onDelete={() => {
                    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
                    void send('/products', 'DELETE', { id: product.id });
                  }}
                  saving={busy}
                  categories={categories}
                />
              ) : (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    setDraft(draftOf(product));
                    setEditing(product.id);
                  }}
                  className="lumen-raise flex w-full items-center gap-3 rounded-card border border-hairline px-3 py-2.5 text-left transition hover:border-accent/40"
                >
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-[8px] border border-hairline object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-dashed border-hairline text-[10px] text-ink-muted">
                      no photo
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-ink-primary">{product.title}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-muted">
                      {[
                        formatRupees(product.pricePaise),
                        product.category,
                        product.stock === null ? null : `${product.stock} in stock`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {!product.active ? <Badge className="shrink-0">hidden</Badge> : null}
                  {product.stock === 0 ? <Badge tone="accent" className="shrink-0">sold out</Badge> : null}
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}

      {tab === 'orders' ? <Orders orders={orders} busy={busy} onStatus={send} /> : null}

      {tab === 'delivery' ? (
        <Delivery rates={rates} busy={busy} onSend={send} />
      ) : null}

      {tab === 'settings' ? (
        <Settings
          settings={settings}
          onChange={setSettings}
          busy={busy}
          onSave={(next) => void send('', 'PATCH', next)}
          siteUrl={siteUrl}
        />
      ) : null}
    </div>
  );
}

/** The order book. Newest first, because that is the one being worked on. */
function Orders({
  orders,
  busy,
  onStatus,
}: {
  orders: ShopOrder[];
  busy: boolean;
  onStatus: (path: string, method: string, body: unknown) => Promise<boolean>;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        message="When someone checks out, their order and their delivery address land here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <details key={order.id} className="rounded-card border border-hairline bg-raised px-4 py-3">
          <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[13px] text-ink-primary">{order.reference}</span>
            <span className="text-[13px] text-ink-secondary">{order.customerName ?? 'No name'}</span>
            <span className="text-[13px] text-ink-primary">{formatRupees(order.totalPaise)}</span>
            {order.status === 'placed' ? <Badge tone="accent">new</Badge> : null}
            <span className="ml-auto text-[12px] text-ink-muted">
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </summary>

          <div className="mt-3 space-y-3 border-t border-hairline pt-3">
            <ul className="space-y-1">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-3 text-[12.5px] text-ink-secondary">
                  <span>
                    {item.title} × {item.quantity}
                  </span>
                  <span>{formatRupees(item.linePaise)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 text-[12.5px] text-ink-muted">
                <span>{order.shippingLabel ?? 'Delivery'}</span>
                <span>{order.shippingPaise === 0 ? 'Free' : formatRupees(order.shippingPaise)}</span>
              </li>
            </ul>

            <div className="grid gap-1 text-[12.5px] leading-relaxed text-ink-secondary">
              {order.customerContact ? (
                <p>
                  <a href={`tel:${order.customerContact}`} className="text-accent hover:underline">
                    {order.customerContact}
                  </a>
                </p>
              ) : null}
              {order.address ? (
                <p className="whitespace-pre-wrap text-ink-muted">
                  {[order.address, order.city, order.postcode].filter(Boolean).join(', ')}
                </p>
              ) : null}
              {order.note ? <p className="text-ink-muted">“{order.note}”</p> : null}
              <p className="text-ink-muted">
                {order.paymentMethod === 'link' ? 'Paying by link' : 'Pay on delivery'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={busy || order.status === status}
                  onClick={() => void onStatus('/orders', 'PATCH', { id: order.id, status })}
                  className={cn(
                    'rounded-pill border px-3 py-1 text-[12px] transition disabled:opacity-100',
                    order.status === status
                      ? 'border-accent/45 bg-accent-soft text-accent'
                      : 'border-hairline text-ink-muted hover:text-ink-primary',
                  )}
                >
                  {ORDER_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

/** What delivery costs, and when it stops costing anything. */
function Delivery({
  rates,
  busy,
  onSend,
}: {
  rates: ShippingRate[];
  busy: boolean;
  onSend: (path: string, method: string, body: unknown) => Promise<boolean>;
}) {
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [price, setPrice] = useState('');
  const [freeOver, setFreeOver] = useState('');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rates.map((rate) => (
          <div
            key={rate.id}
            className="flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-raised px-4 py-3"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] text-ink-primary">{rate.label}</span>
              <span className="mt-0.5 block text-[12px] text-ink-muted">
                {[
                  rate.note,
                  rate.pricePaise === 0 ? 'Free' : formatRupees(rate.pricePaise),
                  rate.freeOverPaise === null
                    ? null
                    : `free over ${formatRupees(rate.freeOverPaise)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            {!rate.active ? <Badge>off</Badge> : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSend('/shipping', 'PATCH', { id: rate.id, active: !rate.active })}
              className="text-[12.5px] text-ink-muted transition hover:text-ink-primary disabled:opacity-40"
            >
              {rate.active ? 'Turn off' : 'Turn on'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSend('/shipping', 'DELETE', { id: rate.id })}
              className="text-[12.5px] text-[#e5735a] transition hover:underline disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        ))}

        {rates.length === 0 ? (
          <EmptyState
            title="No delivery options yet"
            message="Without one, checkout tells your customers that delivery will be arranged with them afterwards."
          />
        ) : null}
      </div>

      <div className="lumen-panel grid gap-3 rounded-card border border-hairline p-4 sm:grid-cols-2">
        <Field label="Name">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Standard delivery"
          />
        </Field>
        <Field label="Note">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="3–5 working days"
          />
        </Field>
        <Field label="Price" hint="0 for free delivery.">
          <Input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            inputMode="decimal"
            placeholder="50"
          />
        </Field>
        <Field label="Free over (optional)" hint="Delivery costs nothing above this basket total.">
          <Input
            value={freeOver}
            onChange={(event) => setFreeOver(event.target.value)}
            inputMode="decimal"
            placeholder="999"
          />
        </Field>
        <div className="sm:col-span-2">
          <Button
            disabled={busy || !label.trim() || !price.trim()}
            onClick={() => {
              void onSend('/shipping', 'POST', { label, note, price, freeOver }).then((ok) => {
                if (!ok) return;
                setLabel('');
                setNote('');
                setPrice('');
                setFreeOver('');
              });
            }}
          >
            Add delivery option
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Whether the shop is open, and how money reaches the owner. */
function Settings({
  settings,
  onChange,
  onSave,
  busy,
  siteUrl,
}: {
  settings: ShopSettings;
  onChange: (settings: ShopSettings) => void;
  onSave: (settings: ShopSettings) => void;
  busy: boolean;
  siteUrl: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="lumen-panel space-y-4 rounded-card border border-hairline p-4 sm:p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.enabled}
            onChange={(event) => onChange({ ...settings, enabled: event.target.checked })}
          />
          <span>
            <span className="block text-[13.5px] text-ink-primary">The shop is open</span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-muted">
              Adds Shop and Basket to your site&apos;s menu, and makes the checkout work.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.codEnabled}
            onChange={(event) => onChange({ ...settings, codEnabled: event.target.checked })}
          />
          <span>
            <span className="block text-[13.5px] text-ink-primary">Pay on delivery</span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-muted">
              Customers order without paying online and you collect on delivery. Leave this on unless
              you have a reason not to — it is how most orders in India are actually paid for.
            </span>
          </span>
        </label>

        <Field
          label="Payment link (optional)"
          hint="A Razorpay, UPI or Stripe link from the app you already use. Shown after an order is placed, with the amount to pay."
        >
          <Input
            value={settings.paymentUrl}
            onChange={(event) => onChange({ ...settings, paymentUrl: event.target.value })}
            placeholder="https://rzp.io/l/your-link"
            spellCheck={false}
          />
        </Field>

        <Field label="What to say about paying" hint="Shown on the checkout page.">
          <Input
            value={settings.paymentNote}
            onChange={(event) => onChange({ ...settings, paymentNote: event.target.value })}
            placeholder="Pay by UPI after ordering — we will send the link."
          />
        </Field>

        <div className="flex items-center gap-3 border-t border-hairline pt-4">
          <Button onClick={() => onSave(settings)} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
          {siteUrl && settings.enabled ? (
            <a
              href={`${siteUrl}shop.html`}
              target="_blank"
              rel="noreferrer"
              className="text-[12.5px] text-accent hover:underline"
            >
              See the shop ↗
            </a>
          ) : null}
        </div>
      </div>

      <p className="text-[12px] leading-relaxed text-ink-muted">
        Lumen never holds your money. An order is recorded here with the customer&apos;s address and
        what they owe; payment happens through your own link or on delivery, between you and them.
      </p>
    </div>
  );
}

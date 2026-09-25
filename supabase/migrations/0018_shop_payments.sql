-- Paying for an order, rather than only placing one.
--
-- A shop could take an order and tell the customer to pay on delivery, or send
-- them to a payment link the owner pasted in by hand. Neither records that
-- money actually arrived, so the owner had no way to tell a paid order from an
-- unpaid one except by remembering.
--
-- These columns hold what Razorpay gives back, and nothing the browser said:
-- the order id is created server-side from the total this table already holds,
-- and paid_at is only written after the signature has been checked against the
-- owner's own key secret.

alter table public.shop_orders add column if not exists payment_provider text;
alter table public.shop_orders add column if not exists payment_order_id text;
alter table public.shop_orders add column if not exists payment_id text;
alter table public.shop_orders add column if not exists paid_at timestamptz;

-- Looked up by the payment order id when the customer comes back from the
-- gateway, so it has to be quick and it has to be unique per shop.
create unique index if not exists shop_orders_payment_order_id_idx
  on public.shop_orders (payment_order_id)
  where payment_order_id is not null;

comment on column public.shop_orders.payment_order_id is
  'The gateway''s own order id. Created server-side from total_paise — never from an amount the browser sent.';
comment on column public.shop_orders.paid_at is
  'Set only after the gateway signature has been verified with the owner''s key secret.';

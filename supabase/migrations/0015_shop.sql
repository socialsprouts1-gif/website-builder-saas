-- A real shop: products, a cart's worth of order, and what it costs to send.
--
-- This is the part that was missing every time someone asked for an
-- e-commerce site and got a gallery with prices printed under the pictures.
-- A picture of a product is not a product: it has a price that changes, a
-- stock count that runs out, a category it belongs to, and an order that has
-- to reach the owner with an address attached.
--
-- Money is stored in paise, as integers. Never floats: 0.1 + 0.2 is not 0.3,
-- and a rupee that is out by a hundredth is a rupee somebody argues about.

-- ---------------------------------------------------------------- products --

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- What the product's page is addressed by. Unique within a shop, because
  -- that is the whole of its URL.
  slug text not null,
  title text not null,
  -- The paragraph on the product page.
  description text,
  -- A one-line version for the card in the grid.
  summary text,
  price_paise integer not null default 0 check (price_paise >= 0),
  -- The crossed-out price, when there is one. Null means not on offer.
  compare_at_paise integer check (compare_at_paise is null or compare_at_paise >= 0),
  category text,
  -- Hosted URLs, in the order they should be shown. The first is the card.
  images jsonb not null default '[]'::jsonb,
  -- Null means "not counted" — plenty of small shops do not count stock, and
  -- forcing them to would take the shop down every time they forgot.
  stock integer check (stock is null or stock >= 0),
  active boolean not null default true,
  -- Where it sits in the grid. Lower first.
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create index if not exists shop_products_project_idx
  on public.shop_products (project_id, position, created_at);

create index if not exists shop_products_category_idx
  on public.shop_products (project_id, category);

-- ---------------------------------------------------------------- shipping --

create table if not exists public.shop_shipping_rates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  -- "2–4 working days", "Same day within Akola" — the bit customers decide on.
  note text,
  price_paise integer not null default 0 check (price_paise >= 0),
  -- Free over this much, when set. Null means it is never free.
  free_over_paise integer check (free_over_paise is null or free_over_paise >= 0),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists shop_shipping_project_idx
  on public.shop_shipping_rates (project_id, position);

-- ------------------------------------------------------------------ orders --

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- What the customer is told to quote. Short, readable over a phone.
  reference text not null,
  customer_name text,
  customer_contact text,
  customer_email text,
  address text,
  city text,
  postcode text,
  note text,
  shipping_label text,
  -- Every total is recorded as charged, not recomputed later: a price that
  -- changes next week must not change what somebody already agreed to pay.
  subtotal_paise integer not null default 0,
  shipping_paise integer not null default 0,
  total_paise integer not null default 0,
  -- placed | paid | packed | sent | cancelled
  status text not null default 'placed',
  -- cod | link — how it is being paid for, as far as the site knows.
  payment_method text not null default 'cod',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, reference)
);

create index if not exists shop_orders_project_created_idx
  on public.shop_orders (project_id, created_at desc);

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  -- Kept if the product is later deleted: the order still has to make sense.
  product_id uuid references public.shop_products(id) on delete set null,
  title text not null,
  unit_paise integer not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  line_paise integer not null default 0
);

create index if not exists shop_order_items_order_idx
  on public.shop_order_items (order_id);

-- ---------------------------------------------------------- shop settings --

alter table public.projects add column if not exists shop_enabled boolean not null default false;
-- Pay on delivery. On by default because for most shops this is the only way
-- money actually changes hands, and a checkout with no way to finish is worse
-- than no checkout.
alter table public.projects add column if not exists shop_cod_enabled boolean not null default true;
-- What is said under the Pay button when a payment link is configured.
alter table public.projects add column if not exists shop_payment_note text;

-- --------------------------------------------------------------------- RLS --
--
-- Owners read and write their own; customers never hold a key at all. The
-- public shop page and the checkout endpoint both go through the service role,
-- exactly as enquiries do, so a visitor's browser can never read a stock
-- count, another shop's orders, or anyone's address.

alter table public.shop_products enable row level security;
alter table public.shop_shipping_rates enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

drop policy if exists "owners manage their products" on public.shop_products;
create policy "owners manage their products"
  on public.shop_products for all
  to authenticated
  using (
    exists (select 1 from public.projects p where p.id = shop_products.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = shop_products.project_id and p.user_id = auth.uid())
  );

drop policy if exists "owners manage their shipping" on public.shop_shipping_rates;
create policy "owners manage their shipping"
  on public.shop_shipping_rates for all
  to authenticated
  using (
    exists (select 1 from public.projects p where p.id = shop_shipping_rates.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = shop_shipping_rates.project_id and p.user_id = auth.uid())
  );

drop policy if exists "owners read their orders" on public.shop_orders;
create policy "owners read their orders"
  on public.shop_orders for select
  to authenticated
  using (
    exists (select 1 from public.projects p where p.id = shop_orders.project_id and p.user_id = auth.uid())
  );

drop policy if exists "owners update their orders" on public.shop_orders;
create policy "owners update their orders"
  on public.shop_orders for update
  to authenticated
  using (
    exists (select 1 from public.projects p where p.id = shop_orders.project_id and p.user_id = auth.uid())
  );

drop policy if exists "owners read their order items" on public.shop_order_items;
create policy "owners read their order items"
  on public.shop_order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.shop_orders o
      join public.projects p on p.id = o.project_id
      where o.id = shop_order_items.order_id and p.user_id = auth.uid()
    )
  );

-- Credits given by hand.
--
-- The free tier is derived rather than stored: what is left is FREE_CREDITS
-- minus everything the account has ever spent on the shared key. That is the
-- right shape — there is no balance to keep in step and a refund is a deleted
-- row — but it leaves no way to give somebody more. A friend testing the
-- product, a beta user, an apology for a build that failed: all of them need
-- credits that did not come from signing up.
--
-- So a grant is a row, and the balance adds them up. It keeps the property that
-- made the derived version worth having: nothing can drift, every credit has a
-- reason and a date against it, and taking one back is deleting the row that
-- gave it.

create table if not exists public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- Positive to give, negative to take back. Both are history.
  credits integer not null,
  -- Why. Shown in the admin panel and nowhere else.
  reason text,
  granted_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists credit_grants_user_idx
  on public.credit_grants (user_id, created_at desc);

alter table public.credit_grants enable row level security;

-- Written by the service role only. An account may see what it was given —
-- the meter counts it — but nobody may write themselves a balance.
drop policy if exists "owner reads own grants" on public.credit_grants;
create policy "owner reads own grants"
  on public.credit_grants for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "admins read grants" on public.credit_grants;
create policy "admins read grants"
  on public.credit_grants for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin));

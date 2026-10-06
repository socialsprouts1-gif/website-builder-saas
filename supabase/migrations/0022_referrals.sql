-- Bring somebody in, both of you get credits.
--
-- The reward itself is a credit_grants row, which is why this table holds no
-- balance of its own: the grant is the record of what was given, and this is
-- the record of why. One row per account referred, enforced by a unique index
-- rather than by remembering to check — an account can be referred once, by one
-- person, ever, and the database is the only place that can promise it.

alter table public.users add column if not exists referral_code text;

create unique index if not exists users_referral_code_idx
  on public.users (referral_code)
  where referral_code is not null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users (id) on delete cascade,
  -- The account that signed up. Unique: referred once, by one person, ever.
  referred_id uuid not null references public.users (id) on delete cascade,
  -- The code as it was typed, kept even if the referrer later changes theirs.
  code text not null,
  created_at timestamptz not null default now(),
  constraint referrals_not_self check (referrer_id <> referred_id)
);

create unique index if not exists referrals_referred_idx on public.referrals (referred_id);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id, created_at desc);

alter table public.referrals enable row level security;

-- Read-only, like credit_grants, and for the same reason: the rows pay out in
-- credits, so the service role is the only thing that may write one.
drop policy if exists "owner reads own referrals" on public.referrals;
create policy "owner reads own referrals"
  on public.referrals for select to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid());

drop policy if exists "admins read referrals" on public.referrals;
create policy "admins read referrals"
  on public.referrals for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin));

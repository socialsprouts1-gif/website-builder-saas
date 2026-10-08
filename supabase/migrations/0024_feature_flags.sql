-- Switches, global and per account.
--
-- Two tables rather than one, because they answer two different questions and
-- the per-account one has to be able to say "on" as loudly as it says "off".
-- A single table keyed on a nullable user_id would make "off for everyone,
-- on for this one person" a pair of rows whose precedence lived in whichever
-- query happened to read them.
--
-- Precedence is decided in src/lib/features.ts and nowhere else: a row for the
-- user wins, then the global switch, then the default written in the code.
-- Absent rows are the normal case — nothing is written until somebody flips
-- something — so every query has to treat "no row" as "use the default".

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.user_features (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (user_id, key)
);

create index if not exists user_features_user_idx on public.user_features (user_id);

alter table public.feature_flags enable row level security;
alter table public.user_features enable row level security;

-- Read-only to the account it is about, so the app can hide what it must hide
-- without going through the service role on every page render. Written only by
-- the service role, which is what the admin actions use: a user who could write
-- their own row could switch on anything that was switched off.
drop policy if exists "owner reads own feature overrides" on public.user_features;
create policy "owner reads own feature overrides"
  on public.user_features for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "admins read feature overrides" on public.user_features;
create policy "admins read feature overrides"
  on public.user_features for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin));

-- The global switches are not a secret: every signed-in account needs to know
-- whether a feature is open in order to render the sidebar correctly.
drop policy if exists "everyone reads feature flags" on public.feature_flags;
create policy "everyone reads feature flags"
  on public.feature_flags for select to authenticated
  using (true);

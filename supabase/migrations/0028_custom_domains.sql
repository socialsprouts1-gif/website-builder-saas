-- Customers' own domains, held on Lumen's own deployment.
--
-- Connecting a domain used to require the owner to connect a Vercel account
-- and deploy the site there first, which is three technical steps before the
-- one they asked for. The domain now attaches to Lumen's own project, and a
-- request arriving on it is routed to the published site by its hostname —
-- so this table is read on the path of every request that is not Lumen's own
-- host, and the index on hostname is load-bearing rather than tidiness.
--
-- One row per hostname that answers. A root domain gets two: the apex and its
-- www, because a certificate for one is a certificate error on the other.

create table if not exists public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Lower-cased and without a port or scheme; normaliseHostname decides.
  hostname text not null,
  -- The name the owner actually typed. Both rows of a pair share it, so
  -- removing the domain removes the www with it.
  root text not null,
  -- Vercel has issued a certificate and DNS resolves here.
  verified boolean not null default false,
  verified_at timestamptz,
  -- The last thing Vercel said, so the panel can explain a wait.
  last_error text,
  created_at timestamptz not null default now()
);

create unique index if not exists custom_domains_hostname_key on public.custom_domains (hostname);
create index if not exists custom_domains_project_idx on public.custom_domains (project_id);
create index if not exists custom_domains_user_idx on public.custom_domains (user_id);

alter table public.custom_domains enable row level security;

drop policy if exists "own domains" on public.custom_domains;
create policy "own domains" on public.custom_domains
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The published site is served to strangers, so the hostname lookup runs with
-- the service role rather than as the visitor. No anon policy is added: a
-- visitor has no business reading the table at all.

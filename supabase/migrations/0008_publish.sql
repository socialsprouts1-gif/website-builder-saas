-- Publishing: a site gets a public address on Lumen before anyone connects a
-- domain to it, so it can be shared the minute it is built.

alter table public.projects add column if not exists published_at timestamptz;
alter table public.projects add column if not exists public_slug text;
alter table public.projects add column if not exists favicon_url text;

create unique index if not exists projects_public_slug_key
  on public.projects (public_slug)
  where public_slug is not null;

-- A published site is readable by anyone; everything else stays behind RLS.
drop policy if exists "published projects are public" on public.projects;
create policy "published projects are public"
  on public.projects for select
  using (published_at is not null);

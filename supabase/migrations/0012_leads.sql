-- Enquiries from a published site.
--
-- Until now the form on every generated site called form.reset() and wrote
-- "Thank you — we will be in touch shortly." into the page. Nothing was sent
-- anywhere. A customer typed their phone number, believed they had made
-- contact, and the owner never heard. This is where those go instead.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- Everything the visitor typed. All optional: a form that refuses a lead
  -- because a field was blank loses the lead.
  name text,
  contact text,
  message text,
  -- Which page it came from, so "half my enquiries are from the pricing page"
  -- is answerable.
  page text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists leads_project_created_idx
  on public.leads (project_id, created_at desc);

alter table public.leads enable row level security;

-- Only the owner of the project can see or touch its leads. Inserts do not
-- happen through this policy at all: the public endpoint writes with the
-- service role, because the visitor filling in the form is not signed in and
-- must never get a key that can read anything back.
drop policy if exists "owners read their leads" on public.leads;
create policy "owners read their leads"
  on public.leads for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = leads.project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "owners update their leads" on public.leads;
create policy "owners update their leads"
  on public.leads for update
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = leads.project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "owners delete their leads" on public.leads;
create policy "owners delete their leads"
  on public.leads for delete
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = leads.project_id and p.user_id = auth.uid()
    )
  );

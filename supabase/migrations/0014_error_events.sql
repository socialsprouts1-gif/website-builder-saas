-- Somewhere for a failure to be visible.
--
-- A build once ran for two hours writing the same page over and over, and
-- nothing anywhere said so: the catch blocks that kept the site serving also
-- kept the reason to themselves. This is the other half of that trade — keep
-- serving, but write down what went wrong.

create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  -- Both nullable: plenty of failures happen before there is a signed-in user
  -- or a project to blame, and those are exactly the ones worth seeing.
  user_id uuid references public.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  -- Where it happened, as a short dotted name: 'generation.step', 'lead.insert'.
  scope text not null,
  message text not null,
  -- Anything that helps, and nothing that identifies anyone: no request bodies,
  -- no keys, no addresses.
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists error_events_created_idx on public.error_events (created_at desc);
create index if not exists error_events_scope_idx on public.error_events (scope, created_at desc);

alter table public.error_events enable row level security;

-- Written by the service role only, and read by admins. A normal user has no
-- business reading other people's failures, and no need to write their own.
drop policy if exists "admins read errors" on public.error_events;
create policy "admins read errors"
  on public.error_events for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin));
